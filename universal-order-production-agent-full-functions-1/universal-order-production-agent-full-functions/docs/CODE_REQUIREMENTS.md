# Code Requirements

These requirements are mandatory for all contributors and AI coding agents.

## Clean Code

- Do not duplicate table access logic in workflows.
- All table operations must use Data Access Layer functions.
- Business logic must live in services, not in n8n nodes.
- One responsibility per service.
- Functions must be reusable and testable.

## Error Handling

- User-facing errors must be safe and understandable.
- Technical errors must be logged for manager/debug review.
- Google/API/AI failures must create FailedOperations or UserFacingErrors.
- Critical failures must create manager tasks.

## Pricing Rules

- Discount rules can be percentage or fixed amount.
- Manager can define every N-th order discount.
- Personal client price overrides discounts and base price.
- Personal price may be below cost only with explicit warning.
- If price < cost, system must show PRICE_BELOW_COST_REQUIRES_MANAGER_CONFIRMATION.

## Change History

- Every feature/change must update CHANGELOG.md.
- Every meaningful data change must create ActivityLog entry.
- Schema changes must update schema_version and include migration notes.

## Git / CI/CD

- main is protected.
- All changes via Pull Request.
- CI must run tests and schema validation.
- Failed CI should notify maintainers via GitHub Actions summary/issues/tasks.

## Additional consistency requirements

- Do not hardcode orderIndex. Use `getClientOrderIndex(clientId)`.
- All webhook/message inputs must pass through `withIdempotency()` when an event_id is available.
- All status changes must pass through `validateOrderTransition()`.
- Business workflow must use service functions, not duplicate table operations.
- New features must update: schema, tests, README/docs, and CHANGELOG.
