package com.wash.laundry_app.clients;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ClientMapper {

    @Mapping(target = "phones", source = "phones")
    @Mapping(target = "addresses", source = "addresses")
    Client toEntity(ClientRegisterRequest clientRegisterRequest);

    @Mapping(target = "phones", source = "phones")
    @Mapping(target = "addresses", source = "addresses")
    void updateEntity(ClientRegisterRequest request, @MappingTarget Client client);

    @Mapping(target = "phones", source = "phones")
    @Mapping(target = "addresses", source = "addresses")
    ClientDto toDto(Client client);

    ClientPhone toPhoneEntity(ClientPhoneDto dto);
    ClientPhoneDto toPhoneDto(ClientPhone entity);

    ClientAddress toAddressEntity(ClientAddressDto dto);
    ClientAddressDto toAddressDto(ClientAddress entity);
}
