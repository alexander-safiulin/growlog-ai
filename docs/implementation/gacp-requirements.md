# GACP requirements mapping (Growlog)

Status: draft — **do not treat as regulatory advice.**

## Purpose

Track how Growlog data model and workflows support Good Agricultural and Collection Practices (GACP) style audits: traceability, documentation, personnel training, deviation handling, and reproducibility.

## External checklist (TODO)

- [ ] Obtain official Thailand GACP checklist from auditor or consultant
- [ ] Map each checklist item to: table/field, UI surface, report, or manual process
- [ ] Sign-off by quality responsible before audit

## Implemented / planned product mapping

| GACP theme | Growlog capability | Status |
|------------|-------------------|--------|
| Batch / lot identification | `grow_cycles.batch_code`, batch record report | partial |
| Record of operations | `events` spine, `sop_executions` | implemented |
| Approved procedures | `sop_definitions` + `sop_revisions` | implemented in schema and approve API; needs `pnpm db:push` |
| Change control | `sop_revisions` (reason, approver, effective_from) | implemented; append-only after approval |
| Deviations & CAPA | `deviations` | implemented; close is manager/admin |
| Training records | `training_records` + SOP revision ack | schema + acknowledge API |
| Inputs traceability | `materials`, `material_lots`, feed events | event payload `material_lot_id` |
| Harvest & post-harvest | `harvest_records` | harvest event + wet/dry weight |
| QC / lab | `qc_results` | record API |
| Equipment maintenance | `equipment` | schema; handover lists overdue service |
| Environmental monitoring | `sensor_readings`, threshold deviations | partial |
| Access control | RLS + `farm_users` roles (ADR-009) | partial |

## Audit trail principles (code)

- Append-first history for revisions and deviations
- No client direct write to canonical tables without use-case RPC
- AI outputs labeled; facts grounded to DB rows

## Related ADRs

- [ADR-002](../adr/adr-002-data-model.md)
- [ADR-013](../adr/adr-013-cultivation-management-system.md)
