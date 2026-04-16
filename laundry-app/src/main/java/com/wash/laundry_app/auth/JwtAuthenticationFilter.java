package com.wash.laundry_app.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.List;

import com.wash.laundry_app.users.UserRepository;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@AllArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

           var authHeader = request.getHeader("Authorization");
           if(authHeader == null || !authHeader.startsWith("Bearer ")){
               filterChain.doFilter(request,response);
               return;
           }

           var token = authHeader.replace("Bearer ","");
           var jwt = jwtService.parseToken(token);
           if(jwt == null || jwt.isExpired()){
               filterChain.doFilter(request,response);
               return;
           }

//         check if user is inactive
           var userOptional = userRepository.findById(jwt.getUserId());
           if (userOptional.isPresent()) {
               var user = userOptional.get();
               Boolean isActive = user.getIsActive();
               if (isActive != null && !isActive) {
                   SecurityContextHolder.clearContext();
                   response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                   response.setContentType("application/json");
                   response.setCharacterEncoding("UTF-8");
                   response.getWriter().write("{\"error\": \"ACCOUNT_DISABLED\", \"message\": \"Votre compte a été désactivé.\"}");
                   return;
               }
               // HIGH-5: cache fetched user in request to avoid a 2nd DB hit in AuthService
               request.setAttribute("_currentUser", user);
           }


           var authentication  = new UsernamePasswordAuthenticationToken(
                   jwt.getUserId(),
                   null,
                   List.of(new SimpleGrantedAuthority("ROLE_"+jwt.getRole()))
           );
           authentication.setDetails(
                   new WebAuthenticationDetailsSource().buildDetails(request)
           );


           SecurityContextHolder.getContext().setAuthentication(authentication);

           filterChain.doFilter(request,response);
    }
}
