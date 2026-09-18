import type { Movimentacao } from './types'
import { formatDate, formatNumber } from './format'

interface Row {
  Data: string
  Tipo: string
  Descrição: string
  Categoria: string
  Moeda: string
  'Valor original': string
  'Valor (BRL)': string
}

function toRows(movs: Movimentacao[]): Row[] {
  return movs.map((m) => ({
    Data: formatDate(m.data, 'dd/MM/yyyy'),
    Tipo: m.tipo === 'receita' ? 'Receita' : 'Despesa',
    Descrição: m.descricao,
    Categoria: m.categoria?.nome ?? '—',
    Moeda: m.moeda_original,
    'Valor original': formatNumber(m.valor_original),
    'Valor (BRL)': formatNumber(m.valor),
  }))
}

export function exportCSV(movs: Movimentacao[], filename = 'relatorio-moneycontrol.csv') {
  const rows = toRows(movs)
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escape(String(r[h as keyof Row]))).join(';')),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  download(blob, filename)
}

export async function exportXLSX(movs: Movimentacao[], filename = 'relatorio-moneycontrol.xlsx') {
  const XLSX = await import('xlsx')
  const rows = toRows(movs)
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transações')
  XLSX.writeFile(wb, filename)
}

export async function exportPDF(
  movs: Movimentacao[],
  resumo: { label: string; value: string }[],
  filename = 'relatorio-moneycontrol.pdf',
) {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('MoneyControl — Relatório financeiro', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Gerado em ${formatDate(new Date(), 'dd/MM/yyyy')}`, 14, 25)

  let y = 34
  doc.setTextColor(20)
  resumo.forEach((r) => {
    doc.setFontSize(10)
    doc.text(`${r.label}: ${r.value}`, 14, y)
    y += 6
  })

  const rows = toRows(movs)
  autoTable(doc, {
    startY: y + 4,
    head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Moeda', 'Valor (BRL)']],
    body: rows.map((r) => [r.Data, r.Tipo, r.Descrição, r.Categoria, r.Moeda, r['Valor (BRL)']]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 74, 173] },
  })
  doc.save(filename)
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
