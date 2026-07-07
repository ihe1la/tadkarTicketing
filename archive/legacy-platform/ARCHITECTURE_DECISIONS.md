# Architecture decisions

## ADR-001: Modular monolith first

Use one NestJS API organized into domain modules. This reduces deployment and consistency complexity while preserving boundaries that can later be extracted.

## ADR-002: Original UI implementation

Use Angular Material and custom styles. Do not depend on commercial DevExpress or DevExtreme components and do not reproduce the old visual design pixel-for-pixel.

## ADR-003: Shared validated contracts

Define API inputs and outputs with Zod in `packages/contracts`. Validate at the API boundary and reuse generated types in the frontend.

## ADR-004: PostgreSQL and Prisma

Use PostgreSQL for relational integrity and Prisma migrations. Use explicit join tables for roles, permissions, positions, and assignments.

## ADR-005: Secure session model

Use short-lived access credentials and rotating refresh tokens stored in HttpOnly cookies. Persist refresh-token hashes and support revocation. Do not store refresh tokens in browser storage.

## ADR-006: Internal workflow engine for MVP

Implement a small deterministic workflow engine supporting start, user task, decision, service adapter, and end. Keep an adapter interface for future Flowable or Camunda integration.

## ADR-007: JSON form schema

Build an original versioned JSON schema for dynamic forms. Never evaluate arbitrary JavaScript supplied in form definitions.

## ADR-008: Append-only audit

Audit records are immutable through public application APIs. Sensitive values are redacted before persistence.

## ADR-009: Object storage adapter

Store attachments in MinIO locally and expose an S3-compatible interface for production migration.

## ADR-010: Security headers at reverse proxy and application

Apply security headers through Nginx, with application tests that verify the deployed configuration.
