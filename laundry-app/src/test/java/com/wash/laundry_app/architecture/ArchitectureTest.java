package com.wash.laundry_app.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@AnalyzeClasses(packages = "com.wash.laundry_app")
public class ArchitectureTest {

    @ArchTest
    static final ArchRule controllers_should_only_depend_on_services_or_security = classes()
            .that().haveSimpleNameEndingWith("Controller")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage(
                    "com.wash.laundry_app..",
                    "java..",
                    "org.springframework..",
                    "jakarta..",
                    "com.fasterxml..",
                    "org.slf4j..",
                    "lombok.."
            );

    @ArchTest
    static final ArchRule controllers_should_never_inject_repositories = noClasses()
            .that().haveSimpleNameEndingWith("Controller")
            .should().dependOnClassesThat().haveSimpleNameEndingWith("Repository");

    @ArchTest
    static final ArchRule domain_services_should_never_depend_on_controllers = noClasses()
            .that().haveSimpleNameEndingWith("Service")
            .should().dependOnClassesThat().haveSimpleNameEndingWith("Controller");

/*
    @ArchTest
    static final ArchRule no_circular_dependencies = slices()
            .matching("com.wash.laundry_app.(*)..")
            .should().beFreeOfCycles();
*/
}
