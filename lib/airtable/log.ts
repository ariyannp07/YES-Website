import 'server-only'

import { airtableConfig, createRecord } from '@/lib/airtable/client'

/**
 * The append-only audit trail (canon 05-human-ai-policy R2, Boola schema `Log`).
 *
 * Every automated run writes exactly one row, including failures: "A failed run
 * still writes a row." R2 also says attribution means a human name, not
 * "system" — an automated run carries the human owner of the workflow. That
 * owner is INTAKE_LOG_OWNER; if it is unset the row still writes, marked so the
 * gap is visible in the audit rather than hidden.
 */

export interface LogEntry {
  readonly workflow: 'intake'
  readonly inputRef: string
  readonly outputRef: string
  readonly outcome: string
}

const UNATTRIBUTED = 'system (INTAKE_LOG_OWNER unset)'

export const writeLog = async (entry: LogEntry): Promise<void> => {
  const config = airtableConfig()
  if (!config) return

  await createRecord(config, config.logTable, {
    timestamp: new Date().toISOString(),
    workflow: entry.workflow,
    run_by: process.env.INTAKE_LOG_OWNER ?? UNATTRIBUTED,
    input_ref: entry.inputRef,
    output_ref: entry.outputRef,
    outcome: entry.outcome,
  })
}
