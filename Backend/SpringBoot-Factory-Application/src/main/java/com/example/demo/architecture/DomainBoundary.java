package com.example.demo.architecture;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Architectural annotation identifying the Bounded Context to which
 * a class, interface, or package belongs.
 *
 * Used for architectural documentation, static analysis, and automated
 * architectural compliance tests during the microservices evolution.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.PACKAGE})
public @interface DomainBoundary {

    /**
     * The Bounded Context owning this component.
     */
    BoundedContext value();

    /**
     * Optional description of the component's role within the bounded context.
     */
    String description() default "";
}
