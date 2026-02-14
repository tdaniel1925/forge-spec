/**
 * Automation System Entry Point
 * Stage 6 — Automation (Layer 5)
 *
 * Exports all automation utilities for use in API routes and background workers.
 */

// Core infrastructure
export * from './logger';
export * from './executor';
export * from './listener';
export * from './scheduler';
export * from './registry';

// Email utilities
export * from './email';

// Rule handlers
export * from './rules';
