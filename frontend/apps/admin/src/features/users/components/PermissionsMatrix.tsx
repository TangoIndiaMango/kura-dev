import { Checkbox } from '@mantine/core'
import {
  CRUD_ACTIONS,
  MATRIX_MODULES,
  matrixCellGranted,
  type CrudAction,
} from '../rolesData'

/** Original role-detail permissions matrix — read-only against live grant codes. */
export function PermissionsMatrix({ codes }: { codes: string[] }) {
  return (
    <section className="min-w-0 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
      <div className="border-b border-[var(--bd)] px-4 py-3">
        <h2 className="text-[14px] font-bold text-[var(--tx)]">Permissions</h2>
      </div>
      <div className="kura-table-scroll overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--in)]">
              <th className="px-3 py-2.5 text-[12px] font-bold text-[var(--mu)]">
                Module
              </th>
              {CRUD_ACTIONS.map((action) => (
                <th
                  key={action}
                  className="px-3 py-2.5 text-center text-[12px] font-bold capitalize text-[var(--mu)]"
                >
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_MODULES.map((mod) => (
              <tr key={mod} className="border-b border-[var(--bd)] last:border-0">
                <td className="px-3 py-2.5 text-[13px] font-semibold text-[var(--tx)]">
                  {mod}
                </td>
                {CRUD_ACTIONS.map((action: CrudAction) => {
                  const checked = matrixCellGranted(codes, mod, action)
                  return (
                    <td key={action} className="px-3 py-2.5 text-center">
                      <Checkbox
                        aria-label={`${mod} ${action}`}
                        checked={checked}
                        readOnly
                        disabled
                        className="inline-flex justify-center"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
