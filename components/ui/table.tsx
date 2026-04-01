import { cn } from "@/lib/utils";

export function DataTable({
  headers,
  rows,
  className,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  className?: string;
}) {
  return (
    <div className={cn("overflow-auto", className)}>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            {headers.map((header) => (
              <th key={header} className="px-4 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-900/80 text-slate-200 hover:bg-slate-900/40">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
