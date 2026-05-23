package com.wash.laundry_app.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public void save(RefreshToken token) {
        refreshTokenRepository.save(token);
    }

    @Transactional(readOnly = true)
    public Optional<RefreshToken> findByTokenHash(String hash) {
        return refreshTokenRepository.findByTokenHash(hash);
    }

    @Transactional
    public void deleteByTokenHash(String hash) {
        refreshTokenRepository.deleteByTokenHash(hash);
    }
}
