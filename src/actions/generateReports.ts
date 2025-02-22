// @ts-nocheck 
'use server'

import ExcelJS from 'exceljs'
import { Readable } from 'stream'

export async function processAmazonAdsUpload(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) throw new Error('No file uploaded')

    // Create readable stream from file buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = Readable.from(buffer)
    
    // Initialize workbook reader with streaming
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
      worksheets: 'emit',
      sharedStrings: 'cache',
      entries: 'emit'
    })

    // Initialize data collectors
    const processingData = {
      abData: new Map<string, any>(),        // AB Optimization data
      reportData: new Map<string, any>(),    // Search Term Report data
      abcData: new Map<string, any>()        // ABC Optimization data
    }

    // Process worksheets sequentially
    for await (const worksheetReader of workbookReader) {
      switch (worksheetReader.name.trim()) {
        case 'Sponsored Products Campaigns':
          await processABSheet(worksheetReader, processingData)
          await processABCSheet(worksheetReader, processingData)
          break
        case 'SP Search Term Report':
          await processReportSheet(worksheetReader, processingData)
          break
      }
    }

    // Process collected data and calculate metrics
    const keywordData = processABData(processingData.abData)
    const negativeData = processReportData(processingData.reportData)
    const placementData = processABCData(processingData.abcData)

    // Generate final report
    const outputBuffer = await generateBulkUpload(
      keywordData,
      negativeData,
      placementData
    )

    return { data: outputBuffer.dataUrl }
  } catch (error) {
    console.error('Processing error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Stream processors
async function processABSheet(worksheetReader: ExcelJS.stream.xlsx.WorksheetReader, data: any) {
  let headers: string[] = []
  
  for await (const row of worksheetReader) {
    if (row.number === 1) {
      headers = row.values as string[]
      continue
    }

    const rowData = mapRowData(headers, row.values)
    
    if (rowData.State === 'enabled' && !isNaN(Number(rowData['Keyword ID']))) {
      const key = rowData['Keyword ID']
      const existing = data.abData.get(key) || createNewABEntry(rowData)
      
      updateMetrics(existing, rowData)
      data.abData.set(key, existing)
    }
  }
}

async function processReportSheet(worksheetReader: ExcelJS.stream.xlsx.WorksheetReader, data: any) {
  let headers: string[] = []
  
  for await (const row of worksheetReader) {
    if (row.number === 1) {
      headers = row.values as string[]
      continue
    }

    const rowData = mapRowData(headers, row.values)
    
    if (rowData['Campaign State (Informational only)'] === 'enabled') {
      const term = rowData['Customer Search Term']
      const existing = data.reportData.get(term) || createNewReportEntry(rowData)
      
      updateMetrics(existing, rowData)
      data.reportData.set(term, existing)
    }
  }
}

async function processABCSheet(worksheetReader: ExcelJS.stream.xlsx.WorksheetReader, data: any) {
  let headers: string[] = []
  
  for await (const row of worksheetReader) {
    if (row.number === 1) {
      headers = row.values as string[]
      continue
    }

    const rowData = mapRowData(headers, row.values)
    
    if (rowData.Entity === 'Bidding Adjustment' && rowData['Campaign State (Informational only)'] === 'enabled') {
      const placement = rowData.Placement
      const existing = data.abcData.get(placement) || createNewABCEntry(rowData)
      
      updateMetrics(existing, rowData)
      data.abcData.set(placement, existing)
    }
  }
}

// Data processors
function processABData(abMap: Map<string, any>) {
  return Array.from(abMap.values()).map(calculateKeywordMetrics)
}

function processReportData(reportMap: Map<string, any>) {
  return Array.from(reportMap.values()).map(calculateNegativeMetrics)
}

function processABCData(abcMap: Map<string, any>) {
  return Array.from(abcMap.values()).map(calculatePlacementMetrics)
}

// Metric calculators
function calculateKeywordMetrics(entry: any) {
  const roas = entry.spend > 0 ? entry.sales / entry.spend : 0
  const cpc = entry.clicks > 0 ? entry.spend / entry.clicks : 0
  const idealCpc = entry.clicks > 0 ? (entry.sales * 0.2) / entry.clicks : 0
  const diffCpc = (idealCpc - cpc) / cpc
  
  let newBid = entry.bid || entry.defaultBid
  if (diffCpc < 0 && entry.units > 3) {
    newBid = Math.max(newBid + (newBid * diffCpc), 0.02)
  } else if (diffCpc > 0) {
    if (entry.units >= 10 && entry.units <= 50) newBid *= 1.0075
    else if (entry.units > 50 && entry.units <= 100) newBid *= 1.01
    else if (entry.units > 100) newBid *= 1.02
  }

  return {
    ...entry,
    roas: Number(roas.toFixed(4)),
    cpc: Number(cpc.toFixed(4)),
    idealCpc: Number(idealCpc.toFixed(4)),
    diffCpc: Number.isFinite(diffCpc) ? Number(diffCpc.toFixed(4)) : 0,
    newBid: Number(newBid)
  }
}

function calculateNegativeMetrics(entry: any) {
  const isProduct = entry.term.startsWith('b0')
  return {
    term: isProduct ? `asin="${entry.term}"` : entry.term,
    ...entry,
    roas: Number((entry.sales / entry.spend).toFixed(4)),
    cpc: Number((entry.spend / entry.clicks).toFixed(4)),
    action: entry.clicks >= 10 && entry.units < 1 ? 
      'To be added as Negative Search term' : '',
    isNegativeKW: !isProduct,
    isNegativeProduct: isProduct
  }
}

function calculatePlacementMetrics(entry: any) {
  const roas = entry.spend > 0 ? entry.sales / entry.spend : 0
  const cpc = entry.clicks > 0 ? entry.spend / entry.clicks : 0
  const idealCpc = entry.clicks > 0 ? (entry.sales * 0.2) / entry.clicks : 0
  const diffCpc = (idealCpc - cpc) / cpc
  
  let newBid = entry.percentage
  if (diffCpc > 0) {
    if (entry.units >= 3 && entry.units <= 10) {
      newBid = Math.min(newBid + (newBid * (diffCpc / 5)), 899)
    } else if (entry.units > 10 && entry.units <= 30) {
      newBid = Math.min(newBid + (newBid * (diffCpc / 4)), 899)
    } else if (entry.units > 30 && entry.units <= 50) {
      newBid = Math.min(newBid + (newBid * (diffCpc / 3)), 899)
    } else if (entry.units > 50) {
      newBid = Math.min(newBid + (newBid * (diffCpc / 2)), 899)
    }
  }

  return {
    ...entry,
    roas: Number(roas.toFixed(4)),
    cpc: Number(cpc.toFixed(4)),
    idealCpc: Number(idealCpc.toFixed(4)),
    diffCpc: Number.isFinite(diffCpc) ? Number(diffCpc.toFixed(4)) : 0,
    newBid: Number(newBid)
  }
}

// Helpers
function mapRowData(headers: string[], values: any[]) {
  return headers.reduce((acc, key, idx) => {
    acc[key] = values[idx]
    return acc
  }, {} as Record<string, any>)
}

function updateMetrics(existing: any, rowData: any) {
  existing.impressions += Number(rowData.Impressions) || 0
  existing.clicks += Number(rowData.Clicks) || 0
  existing.spend += Number(rowData.Spend) || 0
  existing.sales += Number(rowData.Sales) || 0
  existing.units += Number(rowData.Units) || 0
}

function createNewABEntry(row: any) {
  return {
    keywordId: row['Keyword ID'],
    campaignId: row['Campaign ID'],
    adGroupId: row['Ad Group ID'],
    bid: row.Bid,
    defaultBid: row['Ad Group Default Bid (Informational only)'],
    campaignName: row['Campaign Name (Informational only)'],
    adGroupName: row['Ad Group Name (Informational only)'],
    targeting: row['Resolved Product Targeting Expression (Informational only)'],
    impressions: 0,
    clicks: 0,
    spend: 0,
    sales: 0,
    units: 0
  }
}

function createNewReportEntry(row: any) {
  return {
    term: row['Customer Search Term'],
    campaignId: row['Campaign ID'],
    adGroupId: row['Ad Group ID'],
    impressions: 0,
    clicks: 0,
    spend: 0,
    sales: 0,
    units: 0
  }
}

function createNewABCEntry(row: any) {
  return {
    placement: row.Placement,
    campaignId: row['Campaign ID'],
    percentage: Number(row.Percentage) || 0,
    impressions: 0,
    clicks: 0,
    spend: 0,
    sales: 0,
    units: 0
  }
}

async function generateBulkUpload(
  keywords: any[],
  negatives: any[],
  placements: any[]
) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Optimization log - Bidventor')

  worksheet.columns = [
    { header: 'Product', key: 'product' },
    { header: 'Entity', key: 'entity' },
    { header: 'Operation', key: 'operation' },
    { header: 'Campaign ID', key: 'campaignId' },
    { header: 'Ad Group ID', key: 'adGroupId' },
    { header: 'Keyword ID', key: 'keywordId' },
    { header: 'Keyword Text', key: 'keywordText' },
    { header: 'Match Type', key: 'matchType' },
    { header: 'Product Targeting Expression', key: 'targeting' },
    { header: 'Bid', key: 'bid' },
    { header: 'Percentage', key: 'percentage' },
    { header: 'Placement', key: 'placement' }
  ]

  // Add keyword updates
  keywords.forEach(kw => {
    if (kw.newBid) {
      worksheet.addRow({
        product: 'Sponsored Products',
        entity: 'Keyword',
        operation: 'Update',
        campaignId: kw.campaignId,
        adGroupId: kw.adGroupId,
        keywordId: kw.keywordId,
        bid: kw.newBid
      })
    }
  })

  // Add negative targets
  negatives.forEach(neg => {
    if (neg.action) {
      worksheet.addRow({
        product: 'Sponsored Products',
        entity: neg.isNegativeProduct ? 'Negative Product Targeting' : 'Negative Keyword',
        operation: 'Add',
        campaignId: neg.campaignId,
        adGroupId: neg.adGroupId,
        keywordText: neg.isNegativeProduct ? undefined : neg.term,
        targeting: neg.isNegativeProduct ? neg.term : undefined,
        matchType: neg.isNegativeProduct ? undefined : 'negativeExact'
      })
    }
  })

  // Add placement bids
  placements.forEach(pl => {
    if (pl.newBid) {
      worksheet.addRow({
        product: 'Sponsored Products',
        entity: 'Bidding Adjustment',
        operation: 'Update',
        campaignId: pl.campaignId,
        placement: pl.placement,
        percentage: pl.newBid
      })
    }
  })

  // Generate buffer and return as Data URL
  const buffer = await workbook.xlsx.writeBuffer()
  const base64String = buffer.toString('base64')
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64String}`

  return { dataUrl }
}