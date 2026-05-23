package com.wash.laundry_app.users;
import com.wash.laundry_app.auth.AuthService;
import lombok.AllArgsConstructor;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.security.authentication.DisabledException;

import java.util.Collections;


@AllArgsConstructor
@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    private final AuthService authService;


    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var user = userRepository.findByEmail(email).orElseThrow(()->new UsernameNotFoundException("User not found "));

        Boolean isActive = user.getIsActive();
        if (isActive != null && !isActive) {
            throw new DisabledException("Compte désactivé. Contactez votre administrateur.");
        }

        return new User(
                user.getEmail(),
                user.getPassword(),
                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
//
//    public List<UsersListDto> allUsers() {
//        return userRepository.findAllUsersWithProfiles(Role.USER)
//                .stream()
//                .map(userMapper::toUserAndProfileDto)
//                .toList();
//    }
//
//    public store.users.User getUserWithOrders(Long userId) {
//        return userRepository.findUserWithOrders(userId)
//                .orElseThrow(() -> new RuntimeException("User not found"));
//    }
//
//    public UserOrderDetailDto getOrderDetails(Long orderId) {
//        Order order = orderRepository.getByOrderWithItems(orderId)
//                .orElseThrow(() -> new RuntimeException("Order not found"));
//
//        UserOrderDetailDto.CustomerInfo customerInfo = new UserOrderDetailDto.CustomerInfo(
//                order.getCustomer().getId(),
//                order.getCustomer().getEmail(),
//                order.getCustomer().getName()
//        );
//
//        List<UserOrderDetailDto.OrderItemInfo> itemInfos = order.getItems().stream()
//                .map(item -> new UserOrderDetailDto.OrderItemInfo(
//                        item.getProduct().getName(),
//                        item.getUnit_price(),
//                        item.getQuantity(),
//                        item.getTotal_price()
//                ))
//                .collect(Collectors.toList());
//
//        return new UserOrderDetailDto(
//                order.getId(),
//                customerInfo,
//                order.getStatus(),
//                order.getTotalPrice(),
//                order.getCreatedAt(),
//                order.getPaymentMethod(),
//                itemInfos
//        );
//    }
//
//    public UserOrderDto getOrder(Long orderId){
//        var order = orderRepository.getByOrderWithItems(orderId).orElseThrow(OrderNotFoundException::new);
//        var user = authService.currentUser();
//        if(!order.getCustomer().getId().equals(user.getId())){
//            throw new AccessDeniedException("you don't have access to this order");
//        }
//        return orderMapper.UserOrderToDto(order);
//    }
}
