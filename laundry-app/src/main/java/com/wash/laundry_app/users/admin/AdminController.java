package com.wash.laundry_app.users.admin;

import com.wash.laundry_app.clients.ClientDto;
import com.wash.laundry_app.command.CommandeDTO;
import com.wash.laundry_app.statistiques.DailyStatisticsDTO;
import com.wash.laundry_app.statistiques.DateRangeRequest;
import com.wash.laundry_app.statistiques.StatisticsDTO;
import com.wash.laundry_app.statistiques.StatisticsService;
import com.wash.laundry_app.users.*;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@AllArgsConstructor
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminService adminService;
    private final StatisticsService statisticsService;

    @PostMapping("create-user")
    public ResponseEntity<UserDto> createUser(@RequestBody @Valid UserRegisterRequest request, UriComponentsBuilder uriBuilder){
        return adminService.createUser(request,uriBuilder);
    }

    @PutMapping("update-user/{id}")
    public UserDto updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request){
        return adminService.updateUser(id,request);
    }

    @GetMapping("user/{id}")
    public UserDto getUser(@PathVariable Long id){
        return adminService.getSingleUser(id);
    }

    @GetMapping("active-users")
    public List<UserDto> activeUsers(){
        return adminService.getAllActiveUsers();
    }

    @GetMapping("inactive-users")
    public List<UserDto> inActiveUsers(){
        return adminService.getAllInActiveUsers();
    }

    @PatchMapping("inactive-user/{id}")
    public void inActiveUser(@PathVariable Long id){
        adminService.inActive(id);
    }

    @PatchMapping("active-user/{id}")
    public void activeUser(@PathVariable Long id){
        adminService.activateUser(id);
    }

    @DeleteMapping("delete-user/{id}")
    public void deleteInActiveUser(@PathVariable Long id){
        adminService.deleteUser(id);
    }

//    get all commandes
    @GetMapping("/commandes")
    public ResponseEntity<AdminOrdersResponseDTO> allCommandes(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        AdminOrdersResponseDTO response = adminService.getFilteredCommands(status, dateDebut, dateFin, search, page, size, sort);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/commandes/export-csv")
    public ResponseEntity<byte[]> exportCommandesCsv() {
        byte[] csvData = adminService.exportCommandesToCsv();
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=commandes.csv");
        headers.set(org.springframework.http.HttpHeaders.CONTENT_TYPE, "text/csv");
        return new ResponseEntity<>(csvData, headers, HttpStatus.OK);
    }

    // Get commande details
    @GetMapping("/commandes/{id}")
    public ResponseEntity<CommandeDTO> getCommande(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getCommandeById(id));
    }

    // Get clients
    @GetMapping("/clients")
    public ResponseEntity<List<ClientDto>> getClients(
            @RequestParam(required = false) String search) {
        List<ClientDto> clients = adminService.getClientsFiltered(search);
        return ResponseEntity.ok(clients);
    }

    @GetMapping("/clients/statistics")
    public ResponseEntity<ClientStatisticsDto> getClientStatistics() {
        return ResponseEntity.ok(adminService.getClientStatistics());
    }


    // Get client commands
    @GetMapping("/client/{id}")
    public ResponseEntity<List<CommandeDTO>> getClients(@PathVariable  Long id) {
        List<CommandeDTO> commandes = adminService.getClientCommandes(id);
        return ResponseEntity.ok(commandes);
    }

    // ========== STATISTICS ENDPOINTS ==========

    // Get today's statistics
    @GetMapping("/statistics/today")
    public ResponseEntity<StatisticsDTO> getTodayStatistics() {
        return ResponseEntity.ok(statisticsService.getTodayStatistics());
    }



    // Get overall statistics
    @GetMapping("/statistics/overall")
    public ResponseEntity<StatisticsDTO> getOverallStatistics() {
        return ResponseEntity.ok(statisticsService.getOverallStatistics());
    }


    // Get statistics by date range
    @PostMapping("/statistics/date-range")
    public ResponseEntity<StatisticsDTO> getStatisticsByDateRange(
            @Valid @RequestBody DateRangeRequest request) {
        return ResponseEntity.ok(
                statisticsService.getStatisticsByDateRange(request.getDateDebut(), request.getDateFin())
        );
    }


    // Get statistics by date range (GET alternative)
    @GetMapping("/statistics/date-range")
    public ResponseEntity<StatisticsDTO> getStatisticsByDateRangeGet(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin) {
        return ResponseEntity.ok(statisticsService.getStatisticsByDateRange(dateDebut, dateFin));
    }




    // Get daily statistics for specific date
    @GetMapping("/statistics/daily")
    public ResponseEntity<DailyStatisticsDTO> getDailyStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(statisticsService.getDailyStatistics(date));
    }

    // Get last N days statistics
    @GetMapping("/statistics/last-days")
    public ResponseEntity<List<DailyStatisticsDTO>> getLastNDaysStatistics(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(statisticsService.getLastNDaysStatistics(days));
    }


    // Get statistics by livreur
    @GetMapping("/statistics/livreur/{livreurId}")
    public ResponseEntity<StatisticsDTO> getStatisticsByLivreur(
            @PathVariable Long livreurId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin) {
        return ResponseEntity.ok(
                statisticsService.getStatisticsByLivreur(livreurId, dateDebut, dateFin)
        );
    }

    @PutMapping("/change-user-password/{id}")
    public ResponseEntity<?> changeUserPassword(
            @PathVariable Long id,
           @Valid @RequestBody UsersChangePassword password
    ){
        adminService.changePassword(id,password.getPassword());
        return ResponseEntity.ok(Map.of("message","Mot de passe mis à jour avec succès"));
    }



}


