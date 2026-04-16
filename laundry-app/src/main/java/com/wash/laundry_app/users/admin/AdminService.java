package com.wash.laundry_app.users.admin;

import com.wash.laundry_app.clients.ClientDto;
import com.wash.laundry_app.clients.ClientMapper;
import com.wash.laundry_app.clients.ClientNotFoundException;
import com.wash.laundry_app.clients.ClientRepository;
import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.users.*;
import com.wash.laundry_app.users.employe.CommandDetails;
import com.wash.laundry_app.users.employe.CommandDtoEmploye;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;


@Service
@AllArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final CommandeRepository commandeRepository;
    private final CommandeMapper commandeMapper;
    private final ClientRepository clientRepository;
    private final ClientMapper clientMapper;

    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<UserDto> createUser(UserRegisterRequest request, UriComponentsBuilder uriBuilder){
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new InvalidCredentialsException("Cet email est d\u00e9j\u00e0 utilis\u00e9.");
        }
        var user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole(request.getRole());
        userRepository.save(user);
        var userDto = userMapper.toDto(user);
        var uri = uriBuilder.path("/users/{id}").buildAndExpand(userDto.getId()).toUri();
        return ResponseEntity.created(uri).body(userDto);
    }
// update user information
    public UserDto updateUser( Long id, UpdateUserRequest request){
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);

        userMapper.updateUser(request,user);
        userRepository.save(user);
        return userMapper.toDto(user);

    }
// get a single user
    public UserDto getSingleUser(Long id ){
        var user =  userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        return userMapper.toDto(user);
    }
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<UserDto> getAllActiveUsers(){
        return userRepository.findAllActive().stream().map(userMapper::toDto).toList();
    }
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<UserDto> getAllInActiveUsers(){
        return userRepository.findAllInActive().stream().map(userMapper::toDto).toList();
    }
    @org.springframework.transaction.annotation.Transactional
    public void inActive(Long id){
        var user =  userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        if(user.getRole() == Role.admin){
            throw new ForbiddenAdminErrorsException("Impossible de d\u00e9sactiver un compte administrateur.");
        }
        user.setIsActive(false);
        userRepository.save(user);
    }
    @org.springframework.transaction.annotation.Transactional
    public void activateUser(Long id){
        var user =  userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        if(user.getRole() == Role.admin){
            throw new ForbiddenAdminErrorsException("L'administrateur est d\u00e9j\u00e0 actif.");
        }
        user.setIsActive(true);
        userRepository.save(user);
    }
    @org.springframework.transaction.annotation.Transactional
    public void deleteUser(Long id){
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        if(user.getRole() == Role.admin || user.getIsActive()){
            throw new ForbiddenAdminErrorsException("Impossible de supprimer un compte administrateur ou un utilisateur actif.");
        }
        userRepository.delete(user);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public AdminOrdersResponseDTO getFilteredCommands(
            String status,
            java.time.LocalDate dateDebut,
            java.time.LocalDate dateFin,
            String search,
            int page,
            int size,
            String sortDirection) {

        CommandeStatus statusEnum = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                statusEnum = CommandeStatus.valueOf(status.toLowerCase());
            } catch (IllegalArgumentException e) {
                // Ignore invalid status
            }
        }

        java.time.LocalDateTime dateTimeDebut = dateDebut != null ? dateDebut.atStartOfDay() : null;
        java.time.LocalDateTime dateTimeFin = dateFin != null ? dateFin.atTime(23, 59, 59) : null;

        Sort sort = Sort.by("dateCreation");
        sort = "asc".equalsIgnoreCase(sortDirection) ? sort.ascending() : sort.descending();

        PageRequest pageable = PageRequest.of(page, size, sort);
        Page<Commande> pageResult = commandeRepository.findFiltered(
                statusEnum, dateTimeDebut, dateTimeFin, search, pageable);

        // Run the global summary stats for the entire filtered set (not just this page)
        Double totalValue   = commandeRepository.findFilteredTotalValue(statusEnum, dateTimeDebut, dateTimeFin, search);
        Long   totalVolumes = commandeRepository.findFilteredTotalVolume(statusEnum, dateTimeDebut, dateTimeFin, search);

        return AdminOrdersResponseDTO.builder()
                .content(pageResult.getContent().stream().map(commandeMapper::toDto).toList())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .currentPage(pageResult.getNumber())
                .pageSize(pageResult.getSize())
                .first(pageResult.isFirst())
                .last(pageResult.isLast())
                .totalValue(totalValue)
                .totalVolumes(totalVolumes)
                .build();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public byte[] exportCommandesToCsv() {
        List<Commande> commandes = commandeRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(Commande::getDateCreation).reversed())
                .toList();
                
        StringBuilder sb = new StringBuilder();
        sb.append("ID,Numero Commande,Client,Telephone,Date Creation,Status,Montant Total,Type Paiement\n");
        
        for (Commande c : commandes) {
            sb.append(c.getId()).append(",");
            sb.append(c.getNumeroCommande() != null ? c.getNumeroCommande() : "").append(",");
            sb.append(c.getClient() != null && c.getClient().getName() != null ? c.getClient().getName().replace(",", " ") : "").append(",");
            String phone = (c.getClient() != null && c.getClient().getPhones() != null && !c.getClient().getPhones().isEmpty()) 
                    ? c.getClient().getPhones().get(0).getPhoneNumber() : "";
            sb.append(phone).append(",");
            sb.append(c.getDateCreation() != null ? c.getDateCreation().toString() : "").append(",");
            sb.append(c.getStatus() != null ? c.getStatus().name() : "").append(",");
            sb.append(c.getMontantTotal()).append(",");
            sb.append(c.getModePaiement() != null ? c.getModePaiement().name() : "").append("\n");
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }
    // Get commande by ID
    public CommandeDTO getCommandeById(Long id) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(CommandeNotFoundException::new);
        return commandeMapper.toDto(commande);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<ClientDto> getClientsFiltered(String search){
        List<Client> list = clientRepository.findAll();
        if (search != null && !search.trim().isEmpty()) {
            String lowerSearch = search.toLowerCase();
            list = list.stream()
                .filter(c -> (c.getName() != null && c.getName().toLowerCase().contains(lowerSearch)) ||
                             (c.getEmail() != null && c.getEmail().toLowerCase().contains(lowerSearch)) ||
                             (c.getPhones() != null && c.getPhones().stream().anyMatch(p -> p.getPhoneNumber() != null && p.getPhoneNumber().contains(lowerSearch))))
                .toList();
        }
        // Single batch query for all client stats — eliminates N+1
        Map<Long, Object[]> statsMap = buildClientStatsMap(list);
        return list.stream().map(client -> {
            ClientDto dto = clientMapper.toDto(client);
            applyClientStats(statsMap, client.getId(), dto);
            return dto;
        }).toList();
    }

    private Map<Long, Object[]> buildClientStatsMap(List<Client> clients) {
        if (clients.isEmpty()) return java.util.Collections.emptyMap();
        List<Long> ids = clients.stream().map(Client::getId).toList();
        return commandeRepository.findOrderStatsByClientIds(ids)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> row));
    }

    private void applyClientStats(Map<Long, Object[]> statsMap, Long clientId, ClientDto dto) {
        Object[] row = statsMap.get(clientId);
        if (row != null) {
            dto.setTotalCommandes((Long) row[1]);
            dto.setLastOrderDate((LocalDateTime) row[2]);
        } else {
            dto.setTotalCommandes(0L);
        }
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ClientStatisticsDto getClientStatistics() {
        List<Client> allClients = clientRepository.findAll();
        long totalClients = allClients.size();
        
        java.time.YearMonth currentMonth = java.time.YearMonth.now();
        
        long nouveauxCeMois = allClients.stream()
            .filter(c -> c.getCreatedAt() != null && java.time.YearMonth.from(c.getCreatedAt()).equals(currentMonth))
            .count();
            
        long commandesCeMois = commandeRepository.findAll().stream()
            .filter(cmd -> cmd.getDateCreation() != null && java.time.YearMonth.from(cmd.getDateCreation()).equals(currentMonth))
            .count();
            
        double pourcentageNouveaux = totalClients == 0 ? 0 : (double) nouveauxCeMois / totalClients * 100;
        
        return ClientStatisticsDto.builder()
            .totalClients(totalClients)
            .commandesCeMois(commandesCeMois)
            .nouveauxCeMois(nouveauxCeMois)
            .pourcentageNouveaux(pourcentageNouveaux)
            .build();
    }

        @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<CommandeDTO> getClientCommandes(Long id){
        var client = clientRepository.findById(id).orElseThrow(()-> new ClientNotFoundException("Le client est introuvable."));
        return commandeRepository.findByClientId(client.getId()).stream().map(commandeMapper::toDto).toList();
    }


    public void changePassword(Long id , String newPassword){
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        var incCodedPassword = passwordEncoder.encode(newPassword);
        user.setPassword(incCodedPassword);
        userRepository.save(user);
    }
}
