package com.wash.laundry_app.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Slf4j
public class PerformanceMonitoringAspect {

    @Around("execution(* com.wash.laundry_app..services..*(..)) || execution(* com.wash.laundry_app..command.services..*(..))")
    public Object monitorPerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        try {
            return joinPoint.proceed();
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;
            String className = joinPoint.getSignature().getDeclaringTypeName();
            String methodName = joinPoint.getSignature().getName();
            if (executionTime >= 1000) {
                log.warn("SLOW_SERVICE | {}.{} exceeded SLA ({} ms)", className, methodName, executionTime);
            } else {
                log.info("SERVICE_PERFORMANCE | {}.{} executed in {} ms", className, methodName, executionTime);
            }
        }
    }
}
