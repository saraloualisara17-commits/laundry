package com.wash.laundry_app.users.employe;

import com.wash.laundry_app.command.CommandeMapper;
import com.wash.laundry_app.command.CommandeRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;


@AllArgsConstructor
@Service
public class EmployeService {
    private final CommandeRepository commandeRepository;
    private  final CommandeMapper commandeMapper;
//    get all the command
    @Transactional(readOnly = true)
    public List<CommandDtoEmploye> getCommands(){
        return commandeRepository.findAll().stream().map(commandeMapper::todto).toList();
    }

    @Transactional(readOnly = true)
    public List<CommandDtoEmploye> getPendingCommands() {
        return commandeRepository.findByStatus(com.wash.laundry_app.command.CommandeStatus.en_attente)
                .stream()
                .map(commandeMapper::todto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CommandDtoEmploye> getReturnedCommands() {
        return commandeRepository.findByStatus(com.wash.laundry_app.command.CommandeStatus.retournee)
                .stream()
                .map(commandeMapper::todto)
                .toList();
    }



}
