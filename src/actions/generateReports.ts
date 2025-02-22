// @ts-nocheck
'use server'

import ExcelJS from 'exceljs'
import { Readable } from 'stream'

interface OptimizationData {
  productTargeting: Map<string, ProductTargetingEntry>
  keywords: Map<string, KeywordEntry>
  placements: Map<string, PlacementEntry>
  negativeTerms: Map<string, NegativeTermEntry>
}

interface ProductTargetingEntry {
  id: string
  campaignId: string
  adGroupId: string
  bid: number
  defaultBid: number
  campaignName: string
  adGroupName: string
  targeting: string
  impressions: number
  clicks: number
  spend: number
  sales: number
  units: number
  roas?: number
  cpc?: number
  newBid?: number
}

interface KeywordEntry {
  id: string
  campaignId: string
  adGroupId: string
  bid: number
  defaultBid: number
  campaignName: string
  adGroupName: string
  targeting: string
  impressions: number
  clicks: number
  spend: number
  sales: number
  units: number
  roas?: number
  cpc?: number
  newBid?: number
}

interface PlacementEntry {
  placement: string
  percentage: number
  campaignId: string
  adGroupId: string
  campaignName: string
  adGroupName: string
  impressions: number
  clicks: number
  spend: number
  sales: number
  units: number
  roas?: number
  cpc?: number
  newBid?: number
}

interface NegativeTermEntry {
  term: string
  campaignId: string
  adGroupId: string
  keywordId?: string
  campaignName: string
  adGroupName: string
  impressions: number
  clicks: number
  spend: number
  sales: number
  units: number
  action?: string
  isProduct?: boolean
  formattedTerm?: string
}

export async function processAmazonAdsUpload(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) throw new Error('No file uploaded')

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await processExcelFile(buffer)
    
    const optimizationLog = await generateOptimizationLog(data)
    const bulkUpload = await generateBulkUploadFile(data)

    return {
      optimizationLog: optimizationLog.dataUrl,
      bulkUpload: bulkUpload.dataUrl
    }
  } catch (error) {
    console.error('Processing error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function processExcelFile(buffer: Buffer): Promise<OptimizationData> {
  const stream = Readable.from(buffer)
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    entries: 'emit'
  })

  const data: OptimizationData = {
    productTargeting: new Map(),
    keywords: new Map(),
    placements: new Map(),
    negativeTerms: new Map()
  }

  for await (const worksheetReader of workbookReader) {
    switch (worksheetReader.name.trim()) {
      case 'Sponsored Products Campaigns':
        await processCampaignsSheet(worksheetReader, data)
        break
      case 'SP Search Term Report':
        await processSearchTermSheet(worksheetReader, data)
        break
    }
  }

  calculateBidsAndMetrics(data)
  return data
}

async function processCampaignsSheet(reader: ExcelJS.stream.xlsx.WorksheetReader, data: OptimizationData) {
  let headers: string[] = []

  for await (const row of reader) {
    if (row.number === 1) {
      headers = row.values as string[]
      continue
    }

    const rowData = mapRowData(headers, row.values)
    
    if (rowData.Entity === 'Product Targeting' && rowData.State === 'enabled') {
      processProductTargetingRow(rowData, data)
    }
    
    if (rowData.Entity === 'Keyword' && rowData.State === 'enabled') {
      processKeywordRow(rowData, data)
    }
    
    if (rowData.Entity === 'Bidding Adjustment' && rowData['Campaign State (Informational only)'] === 'enabled') {
      processPlacementRow(rowData, data)
    }
  }
}

function processProductTargetingRow(row: any, data: OptimizationData) {
  const key = row['Product Targeting ID']
  const existing = data.productTargeting.get(key) || {
    id: key,
    campaignId: row['Campaign ID'],
    adGroupId: row['Ad Group ID'],
    bid: parseFloat(row.Bid) || parseFloat(row['Ad Group Default Bid (Informational only)']),
    defaultBid: parseFloat(row['Ad Group Default Bid (Informational only)']),
    campaignName: row['Campaign Name (Informational only)'],
    adGroupName: row['Ad Group Name (Informational only)'],
    targeting: row['Resolved Product Targeting Expression (Informational only)'],
    impressions: 0,
    clicks: 0,
    spend: 0,
    sales: 0,
    units: 0
  }

  updateMetrics(existing, row)
  data.productTargeting.set(key, existing)
}

function processKeywordRow(row: any, data: OptimizationData) {
  const key = row['Keyword ID']
  const existing = data.keywords.get(key) || {
    id: key,
    campaignId: row['Campaign ID'],
    adGroupId: row['Ad Group ID'],
    bid: parseFloat(row.Bid) || parseFloat(row['Ad Group Default Bid (Informational only)']),
    defaultBid: parseFloat(row['Ad Group Default Bid (Informational only)']),
    campaignName: row['Campaign Name (Informational only)'],
    adGroupName: row['Ad Group Name (Informational only)'],
    targeting: row['Resolved Product Targeting Expression (Informational only)'],
    impressions: 0,
    clicks: 0,
    spend: 0,
    sales: 0,
    units: 0
  }

  updateMetrics(existing, row)
  data.keywords.set(key, existing)
}

function processPlacementRow(row: any, data: OptimizationData) {
  const key = row.Placement
  const existing = data.placements.get(key) || {
    placement: key,
    percentage: parseFloat(row.Percentage) || 0,
    campaignId: row['Campaign ID'],
    adGroupId: row['Ad Group ID'],
    campaignName: row['Campaign Name (Informational only)'],
    adGroupName: row['Ad Group Name (Informational only)'],
    impressions: 0,
    clicks: 0,
    spend: 0,
    sales: 0,
    units: 0
  }

  updateMetrics(existing, row)
  data.placements.set(key, existing)
}

async function processSearchTermSheet(reader: ExcelJS.stream.xlsx.WorksheetReader, data: OptimizationData) {
  let headers: string[] = []

  for await (const row of reader) {
    if (row.number === 1) {
      headers = row.values as string[]
      continue
    }

    const rowData = mapRowData(headers, row.values)
    
    if (rowData['Campaign State (Informational only)'] === 'enabled') {
      const term = rowData['Customer Search Term']
      const existing = data.negativeTerms.get(term) || {
        term: term,
        campaignId: rowData['Campaign ID'],
        adGroupId: rowData['Ad Group ID'],
        keywordId: rowData['Keyword ID'],
        campaignName: rowData['Campaign Name (Informational only)'],
        adGroupName: rowData['Ad Group Name (Informational only)'],
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        units: 0
      }

      updateMetrics(existing, rowData)
      data.negativeTerms.set(term, existing)
    }
  }
}

function calculateBidsAndMetrics(data: OptimizationData) {
  // Product Targeting Calculations
  data.productTargeting.forEach(entry => {
    entry.roas = entry.spend > 0 ? entry.sales / entry.spend : 0
    entry.cpc = entry.clicks > 0 ? entry.spend / entry.clicks : 0
    const idealCpc = entry.clicks > 0 ? (entry.sales * 0.2) / entry.clicks : 0
    const diffCpc = entry.cpc > 0 ? (idealCpc - entry.cpc) / entry.cpc : 0

    if (diffCpc < 0 && entry.units > 3) {
      entry.newBid = Math.max(entry.bid + (entry.bid * diffCpc), 0.02)
    } else if (diffCpc > 0) {
      if (entry.units >= 10 && entry.units <= 50) {
        entry.newBid = entry.bid * 1.0075
      } else if (entry.units > 50 && entry.units <= 100) {
        entry.newBid = entry.bid * 1.01
      } else if (entry.units > 100) {
        entry.newBid = entry.bid * 1.02
      }
    }
  })

  // Keyword Calculations
  data.keywords.forEach(entry => {
    entry.roas = entry.spend > 0 ? entry.sales / entry.spend : 0
    entry.cpc = entry.clicks > 0 ? entry.spend / entry.clicks : 0
    const idealCpc = entry.clicks > 0 ? (entry.sales * 0.2) / entry.clicks : 0
    const diffCpc = entry.cpc > 0 ? (idealCpc - entry.cpc) / entry.cpc : 0

    if (diffCpc < 0 && entry.units > 3) {
      entry.newBid = Math.max(entry.bid + (entry.bid * diffCpc), 0.02)
    } else if (diffCpc > 0) {
      if (entry.units >= 10 && entry.units <= 50) {
        entry.newBid = entry.bid * 1.0075
      } else if (entry.units > 50 && entry.units <= 100) {
        entry.newBid = entry.bid * 1.01
      } else if (entry.units > 100) {
        entry.newBid = entry.bid * 1.02
      }
    }
  })

  // Placement Calculations
  data.placements.forEach(entry => {
    entry.roas = entry.spend > 0 ? entry.sales / entry.spend : 0
    entry.cpc = entry.clicks > 0 ? entry.spend / entry.clicks : 0
    const idealCpc = entry.clicks > 0 ? (entry.sales * 0.2) / entry.clicks : 0
    const diffCpc = entry.cpc > 0 ? (idealCpc - entry.cpc) / entry.cpc : 0

    if (diffCpc > 0) {
      if (entry.percentage !== 0) {
        if (entry.units >= 3 && entry.units <= 10) {
          entry.newBid = Math.min(entry.percentage + (entry.percentage * (diffCpc / 5)), 899)
        } else if (entry.units > 10 && entry.units <= 30) {
          entry.newBid = Math.min(entry.percentage + (entry.percentage * (diffCpc / 4)), 899)
        } else if (entry.units > 30 && entry.units <= 50) {
          entry.newBid = Math.min(entry.percentage + (entry.percentage * (diffCpc / 3)), 899)
        } else if (entry.units > 50) {
          entry.newBid = Math.min(entry.percentage + (entry.percentage * (diffCpc / 2)), 899)
        }
      } else {
        if (entry.units >= 3 && entry.units <= 10) {
          entry.newBid = Math.min((diffCpc * 100) / 5, 899)
        } else if (entry.units > 10 && entry.units <= 30) {
          entry.newBid = Math.min((diffCpc * 100) / 4, 899)
        } else if (entry.units > 30 && entry.units <= 50) {
          entry.newBid = Math.min((diffCpc * 100) / 3, 899)
        } else if (entry.units > 50) {
          entry.newBid = Math.min((diffCpc * 100) / 2, 899)
        }
      }
    }
  })

  // Negative Terms Processing
  data.negativeTerms.forEach(entry => {
    entry.action = entry.clicks >= 10 && entry.units < 1 
      ? 'To be added as Negative Search term to avoid wasted ad spend' 
      : ''
    entry.isProduct = entry.term.toLowerCase().startsWith('b0')
    entry.formattedTerm = entry.isProduct ? `asin="${entry.term}"` : entry.term
  })
}

async function generateOptimizationLog(data: OptimizationData) {
  const workbook = new ExcelJS.Workbook()
  
  // Product Targeting Sheet
  const ptSheet = workbook.addWorksheet('Product Targeting IDs')
  ptSheet.columns = [
    { header: 'Product Targeting ID', key: 'id' },
    { header: 'Campaign ID', key: 'campaignId' },
    { header: 'Ad Group ID', key: 'adGroupId' },
    { header: 'Bid', key: 'bid' },
    { header: 'Ad Group Default Bid', key: 'defaultBid' },
    { header: 'Impressions', key: 'impressions' },
    { header: 'Clicks', key: 'clicks' },
    { header: 'Spend', key: 'spend' },
    { header: 'Sales', key: 'sales' },
    { header: 'Units', key: 'units' },
    { header: 'ROAS', key: 'roas' },
    { header: 'CPC', key: 'cpc' },
    { header: 'New Bid', key: 'newBid' }
  ]
  data.productTargeting.forEach(entry => ptSheet.addRow(entry))

  // Keyword Sheet
  const kwSheet = workbook.addWorksheet('Keyword ID')
  kwSheet.columns = [
    { header: 'Keyword ID', key: 'id' },
    { header: 'Campaign ID', key: 'campaignId' },
    { header: 'Ad Group ID', key: 'adGroupId' },
    { header: 'Bid', key: 'bid' },
    { header: 'Ad Group Default Bid', key: 'defaultBid' },
    { header: 'Impressions', key: 'impressions' },
    { header: 'Clicks', key: 'clicks' },
    { header: 'Spend', key: 'spend' },
    { header: 'Sales', key: 'sales' },
    { header: 'Units', key: 'units' },
    { header: 'ROAS', key: 'roas' },
    { header: 'CPC', key: 'cpc' },
    { header: 'New Bid', key: 'newBid' }
  ]
  data.keywords.forEach(entry => kwSheet.addRow(entry))

  // Placement Sheet
  const plSheet = workbook.addWorksheet('Placements')
  plSheet.columns = [
    { header: 'Placement', key: 'placement' },
    { header: 'Percentage', key: 'percentage' },
    { header: 'Campaign ID', key: 'campaignId' },
    { header: 'Ad Group ID', key: 'adGroupId' },
    { header: 'Impressions', key: 'impressions' },
    { header: 'Clicks', key: 'clicks' },
    { header: 'Spend', key: 'spend' },
    { header: 'Sales', key: 'sales' },
    { header: 'Units', key: 'units' },
    { header: 'ROAS', key: 'roas' },
    { header: 'CPC', key: 'cpc' },
    { header: 'New Bid', key: 'newBid' }
  ]
  data.placements.forEach(entry => plSheet.addRow(entry))

  // Negative Terms Sheet
  const negSheet = workbook.addWorksheet('Negative KWs & Targets')
  negSheet.columns = [
    { header: 'Customer Search Term', key: 'term' },
    { header: 'Campaign ID', key: 'campaignId' },
    { header: 'Ad Group ID', key: 'adGroupId' },
    { header: 'Impressions', key: 'impressions' },
    { header: 'Clicks', key: 'clicks' },
    { header: 'Spend', key: 'spend' },
    { header: 'Sales', key: 'sales' },
    { header: 'Units', key: 'units' },
    { header: 'Action', key: 'action' },
    { header: 'Formatted Term', key: 'formattedTerm' }
  ]
  data.negativeTerms.forEach(entry => negSheet.addRow({
    ...entry,
    formattedTerm: entry.formattedTerm
  }))

  const buffer = await workbook.xlsx.writeBuffer()
  return {
    dataUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${buffer.toString('base64')}`
  }
}

async function generateBulkUploadFile(data: OptimizationData) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sponsored Products Campaigns')
  
  sheet.columns = [
    { header: 'Product', key: 'product' },
    { header: 'Entity', key: 'entity' },
    { header: 'Operation', key: 'operation' },
    { header: 'Campaign ID', key: 'campaignId' },
    { header: 'Ad Group ID', key: 'adGroupId' },
    { header: 'Product Targeting ID', key: 'productTargetingId' },
    { header: 'Keyword ID', key: 'keywordId' },
    { header: 'Placement', key: 'placement' },
    { header: 'Bid', key: 'bid' },
    { header: 'Percentage', key: 'percentage' },
    { header: 'Keyword Text', key: 'keywordText' },
    { header: 'Match Type', key: 'matchType' },
    { header: 'Product Targeting Expression', key: 'targetingExpression' }
  ]

  // Product Targeting Updates
  data.productTargeting.forEach(entry => {
    if (entry.newBid) {
      sheet.addRow({
        product: 'Sponsored Products',
        entity: 'Product Targeting',
        operation: 'Update',
        campaignId: entry.campaignId,
        adGroupId: entry.adGroupId,
        productTargetingId: entry.id,
        bid: entry.newBid
      })
    }
  })

  // Keyword Updates
  data.keywords.forEach(entry => {
    if (entry.newBid) {
      sheet.addRow({
        product: 'Sponsored Products',
        entity: 'Keyword',
        operation: 'Update',
        campaignId: entry.campaignId,
        adGroupId: entry.adGroupId,
        keywordId: entry.id,
        bid: entry.newBid
      })
    }
  })

  // Placement Updates
  data.placements.forEach(entry => {
    if (entry.newBid) {
      sheet.addRow({
        product: 'Sponsored Products',
        entity: 'Bidding Adjustment',
        operation: 'Update',
        campaignId: entry.campaignId,
        placement: entry.placement,
        percentage: entry.newBid
      })
    }
  })

  // Negative Targets
  data.negativeTerms.forEach(entry => {
    if (entry.action) {
      if (entry.isProduct) {
        sheet.addRow({
          product: 'Sponsored Products',
          entity: 'Negative Product Targeting',
          operation: 'Add',
          campaignId: entry.campaignId,
          adGroupId: entry.adGroupId,
          targetingExpression: entry.formattedTerm
        })
      } else {
        sheet.addRow({
          product: 'Sponsored Products',
          entity: 'Negative Keyword',
          operation: 'Add',
          campaignId: entry.campaignId,
          adGroupId: entry.adGroupId,
          keywordText: entry.term,
          matchType: 'negativeExact'
        })
      }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return {
    dataUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${buffer.toString('base64')}`
  }
}

// Helper functions
function mapRowData(headers: string[], values: any[]): Record<string, any> {
  return headers.reduce((acc, key, idx) => {
    acc[key] = values[idx]
    return acc
  }, {} as Record<string, any>)
}

function updateMetrics(existing: any, row: any) {
  existing.impressions += Number(row.Impressions) || 0
  existing.clicks += Number(row.Clicks) || 0
  existing.spend += Number(row.Spend) || 0
  existing.sales += Number(row.Sales) || 0
  existing.units += Number(row.Units) || 0
}