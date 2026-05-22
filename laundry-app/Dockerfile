# ─────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────
FROM maven:3.9.9-eclipse-temurin-23 AS build

WORKDIR /build

# Cache dependency layer separately from source
COPY pom.xml .
RUN mvn dependency:go-offline -B --no-transfer-progress

# -Dflyway.skip prevents the Flyway Maven plugin from trying to
# connect to the hardcoded localhost DB during the build phase.
COPY src ./src
RUN mvn clean package -DskipTests -Dflyway.skip=true -B --no-transfer-progress

# ─────────────────────────────────────────────
# Stage 2: Runtime
# ─────────────────────────────────────────────
FROM eclipse-temurin:23-jre

# Non-root user for security
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

COPY --from=build /build/target/*.jar app.jar

# Create uploads directory with correct ownership before switching user
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

# Verify the app is healthy before Docker marks it ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM flags:
#   UseContainerSupport   — respect cgroup memory/CPU limits (on by default in JDK 11+, explicit for clarity)
#   MaxRAMPercentage=75   — use 75% of container RAM for heap, leaving room for off-heap
#   java.security.egd     — fast entropy source, avoids SecureRandom stall on startup
# SPRING_PROFILES_ACTIVE is passed at runtime via docker-compose env, not baked in here.
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/urandom", \
  "-jar", "app.jar"]
