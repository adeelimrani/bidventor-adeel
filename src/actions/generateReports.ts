// @ts-nocheck 
'use server'

import { WorkBook, read, utils } from 'xlsx'
import ExcelJS from 'exceljs'
import { Readable } from 'stream'

export async function processAmazonAdsUpload(formData: FormData) {
    console.log(formData);
    
    let filedata = formData.get('file') as File
    console.log(filedata);
    
  const file = formData.get('file') as File
  if (!file) throw new Error('No file uploaded')

  try {
    // Read input file
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = read(buffer, { type: 'buffer' })
    console.log("Sheet names",workbook.SheetNames);
    
    // Process all three reports
    const keywordData = await processABOptimization(workbook)
    const negativeData = await processAmazonAdsReport(workbook)
    const placementData = await processABCOptimization(workbook)
    
    // Generate bulk upload report
    const outputBuffer = await generateBulkUpload(
      keywordData,
      negativeData,
      placementData
    )

    // Return the file buffer with headers
    return {data: outputBuffer.dataUrl}
  } catch (error) {
    return {error: error.message}
    // throw new Error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// AB Optimization Processor
async function processABOptimization(workbook: WorkBook) {
    console.log(workbook.SheetNames);
  const sheetName = 'Sponsored Products Campaigns'.trim();
  if (!workbook.Sheets[sheetName]) throw new Error(`Missing sheet: ${sheetName}`)

  const ws = workbook.Sheets[sheetName]
  const data: any[] = utils.sheet_to_json(ws)
  
  // Filter and process data
  const filtered = data.filter(row => 
    !isNaN(Number(row['Keyword ID'])) && 
    row.State === 'enabled'
  )

  // Group by Keyword ID
  const grouped = filtered.reduce((acc, row) => {
    const key = row['Keyword ID']
    if (!acc[key]) {
      acc[key] = {
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        units: 0,
        campaignId: row['Campaign ID'],
        adGroupId: row['Ad Group ID'],
        bid: row.Bid,
        defaultBid: row['Ad Group Default Bid (Informational only)'],
        campaignName: row['Campaign Name (Informational only)'],
        adGroupName: row['Ad Group Name (Informational only)'],
        targeting: row['Resolved Product Targeting Expression (Informational only)']
      }
    }
    acc[key].impressions += Number(row.Impressions) || 0
    acc[key].clicks += Number(row.Clicks) || 0
    acc[key].spend += Number(row.Spend) || 0
    acc[key].sales += Number(row.Sales) || 0
    acc[key].units += Number(row.Units) || 0
    return acc
  }, {} as Record<string, any>)

  // Calculate metrics and new bids
  return Object.entries(grouped).map(([keywordId, metrics]) => {
    const roas = metrics.spend > 0 ? metrics.sales / metrics.spend : 0 
    const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0
    const idealCpc = metrics.clicks > 0 ? (metrics.sales * 0.2) / metrics.clicks : 0
    const diffCpc = (idealCpc - cpc) / cpc
    
    let newBid = metrics.bid || metrics.defaultBid
    if (diffCpc < 0 && metrics.units > 3) {
      newBid = Math.max(newBid + (newBid * diffCpc), 0.02)
    } else if (diffCpc > 0) {
      if (metrics.units >= 10 && metrics.units <= 50) newBid *= 1.0075
      else if (metrics.units > 50 && metrics.units <= 100) newBid *= 1.01
      else if (metrics.units > 100) newBid *= 1.02
    }

    return {
      keywordId,
      ...metrics,
      roas: Number(roas.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      idealCpc: Number(idealCpc.toFixed(2)),
      diffCpc: Number.isFinite(diffCpc) ? Number(diffCpc.toFixed(4)) : 0,
      newBid: Number(newBid)
    }
  })
}

// Amazon Ads Report Processor
async function processAmazonAdsReport(workbook: WorkBook) {
  const sheetName = 'SP Search Term Report'.trim();
  if (!workbook.Sheets[sheetName]) throw new Error(`Missing sheet: ${sheetName}`)

  const ws = workbook.Sheets[sheetName]
  const data: any[] = utils.sheet_to_json(ws)
  
  const filtered = data.filter(row => 
    row['Campaign State (Informational only)'] === 'enabled'
  )

  // Group by search term
  const grouped = filtered.reduce((acc, row) => {
    const term = row['Customer Search Term']
    if (!acc[term]) {
      acc[term] = {
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        units: 0,
        campaignId: row['Campaign ID'],
        adGroupId: row['Ad Group ID']
      }
    }
    acc[term].impressions += Number(row.Impressions) || 0
    acc[term].clicks += Number(row.Clicks) || 0
    acc[term].spend += Number(row.Spend) || 0
    acc[term].sales += Number(row.Sales) || 0
    acc[term].units += Number(row.Units) || 0
    return acc
  }, {} as Record<string, any>)

  return Object.entries(grouped).map(([term, metrics]) => {
    const isProduct = term.startsWith('b0')
    return {
      term: isProduct ? `asin="${term}"` : term,
      ...metrics,
      roas: Number((metrics.sales / metrics.spend).toFixed(2)),
      cpc: Number((metrics.spend / metrics.clicks).toFixed(2)),
      action: metrics.clicks >= 10 && metrics.units < 1 ? 
        'To be added as Negative Search term to avoid wasted ad spend' : '',
      isNegativeKW: !isProduct,
      isNegativeProduct: isProduct
    }
  })
}

// ABC Optimization Processor
async function processABCOptimization(workbook: WorkBook) {
  const sheetName = 'Sponsored Products Campaigns'.trim();
  if (!workbook.Sheets[sheetName]) throw new Error(`Missing sheet: ${sheetName}`)

  const ws = workbook.Sheets[sheetName]
  const data: any[] = utils.sheet_to_json(ws)
  
  const filtered = data.filter(row => 
    row.Entity === 'Bidding Adjustment' && 
    row['Campaign State (Informational only)'] === 'enabled'
  )

  // Group by placement
  const grouped = filtered.reduce((acc, row) => {
    const placement = row.Placement
    if (!acc[placement]) {
      acc[placement] = {
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        units: 0,
        campaignId: row['Campaign ID'],
        percentage: Number(row.Percentage) || 0
      }
    }
    acc[placement].impressions += Number(row.Impressions) || 0
    acc[placement].clicks += Number(row.Clicks) || 0
    acc[placement].spend += Number(row.Spend) || 0
    acc[placement].sales += Number(row.Sales) || 0
    acc[placement].units += Number(row.Units) || 0
    return acc
  }, {} as Record<string, any>)

  return Object.entries(grouped).map(([placement, metrics]) => {
    const roas = metrics.spend > 0 ? metrics.sales / metrics.spend : 0
    const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0
    const idealCpc = metrics.clicks > 0 ? (metrics.sales * 0.2) / metrics.clicks : 0
    const diffCpc = (idealCpc - cpc) / cpc
    
    let newBid = metrics.percentage
    if (diffCpc > 0) {
      if (metrics.units >= 3 && metrics.units <= 10) {
        newBid = Math.min(newBid + (newBid * (diffCpc / 5)), 899)
      } else if (metrics.units > 10 && metrics.units <= 30) {
        newBid = Math.min(newBid + (newBid * (diffCpc / 4)), 899)
      } else if (metrics.units > 30 && metrics.units <= 50) {
        newBid = Math.min(newBid + (newBid * (diffCpc / 3)), 899)
      } else if (metrics.units > 50) {
        newBid = Math.min(newBid + (newBid * (diffCpc / 2)), 899)
      }
    }

    return {
      placement,
      ...metrics,
      roas: Number(roas.toFixed(2)),
      cpc: Number(cpc.toFixed(2)),
      idealCpc: Number(idealCpc.toFixed(2)),
      diffCpc: Number.isFinite(diffCpc) ? Number(diffCpc.toFixed(4)) : 0,
      newBid: Number(newBid)
    }
  })
}

// Bulk Upload Generator
async function generateBulkUpload(
  keywords: any[],
  negatives: any[],
  placements: any[]
) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Optimization log - Bidventor')

  // Define columns
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

  // Generate buffer
const buffer = await workbook.xlsx.writeBuffer();

// Calculate file size
const fileSizeKB = (buffer.byteLength / 1024).toFixed(2) + " KB";
console.log(`File size: ${fileSizeKB}`);

// Convert buffer to Base64
const base64String = buffer.toString('base64');

// Create Data URL for Excel file
const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64String}`;

// Return the Data URL
return { dataUrl };
}