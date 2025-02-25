//@ts-nocheck
'use server'

import ExcelJS from 'exceljs'
import { Readable } from 'stream'
import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';
import { PassThrough } from 'stream';

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
  negKwYes?: boolean    // NEW: Flag for negative keyword
  negProdYes?: boolean  // NEW: Flag for product targeting
}

export async function processAmazonAdsUpload(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) throw new Error('No file uploaded')

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await processExcelFile(buffer)
    
    const pdfBuffer = await generateImpactReportPDF(data);
    const optimizationLog = await generateOptimizationLog(data)
    const bulkUpload = await generateBulkUploadFile(data)
    return {
      optimizationLog: optimizationLog.dataUrl,
      bulkUpload: bulkUpload.dataUrl,
      pdfReport: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`
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
    const term = rowData['Customer Search Term']
    const isProduct = term.toLowerCase().startsWith('b0') // Case-insensitive check

    if (rowData['Campaign State (Informational only)'] === 'enabled') {
      const existing = data.negativeTerms.get(term) || {
        term,
        campaignId: rowData['Campaign ID'],
        adGroupId: rowData['Ad Group ID'],
        keywordId: rowData['Keyword ID'],
        campaignName: rowData['Campaign Name (Informational only)'],
        adGroupName: rowData['Ad Group Name (Informational only)'],
        impressions: rowData['Campaign State (Informational only)'],
        clicks: rowData['Clicks'],
        spend: rowData['Spend'],
        sales: rowData['Sales'],
        units: rowData['Units'],
        isProduct,
        negKwYes: !isProduct,       // Set negative keyword flag
        negProdYes: isProduct,      // Set product targeting flag
        formattedTerm: isProduct ? `asin="${term}"` : term
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

    console.log(`Processed ${data.placements.size} placements`);
    data.placements.forEach((entry, key) => {
      console.log(`Placement ${key}: 
        Units: ${entry.units}, 
        Percentage: ${entry.percentage}, 
        New Bid: ${entry.newBid}`
      );
    });
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
    entry.roas = entry.spend > 0 ? entry.sales / entry.spend : 0;
    entry.cpc = entry.clicks > 0 ? entry.spend / entry.clicks : 0;
    const idealCpc = entry.clicks > 0 ? (entry.sales * 0.2) / entry.clicks : 0;
    const diffCpc = entry.cpc > 0 ? (idealCpc - entry.cpc) / entry.cpc : 0;
  
    // Reset newBid to ensure clean calculation
    entry.newBid = 0.02;
  
    if (diffCpc > 0) {
      if (entry.percentage !== 0) {
        // Percentage-based adjustments
        if (entry.units >= 3 && entry.units <= 10) {
          entry.newBid = Math.min(entry.percentage + (entry.percentage * (diffCpc / 5)), 899);
        } else if (entry.units > 10 && entry.units <= 30) {
          entry.newBid = Math.min(entry.percentage + (entry.percentage * (diffCpc / 4)), 899);
        } else if (entry.units > 30 && entry.units <= 50) {
          entry.newBid = Math.min(entry.percentage + (entry.percentage * (diffCpc / 3)), 899);
        } else if (entry.units > 50) {
          entry.newBid = Math.min(entry.percentage + (entry.percentage * (diffCpc / 2)), 899);
        }
      } else {
        // New percentage creation
        const baseMultiplier = 
          entry.units >= 3 && entry.units <= 10 ? 5 :
          entry.units > 10 && entry.units <= 30 ? 4 :
          entry.units > 30 && entry.units <= 50 ? 3 : 2;
        
        entry.newBid = Math.min((diffCpc * 100) / baseMultiplier, 899);
      }
    }
  
    // Ensure at least 0.02 minimum bid
    if (entry.newBid !== undefined) {
      entry.newBid = Math.max(entry.newBid, 0.02);
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
    negKwYes: entry.negKwYes ? 'YES' : 'NO',       // Convert boolean to display
    negProdYes: entry.negProdYes ? 'YES' : 'NO'    // Convert boolean to display
  }))

  const buffer = await workbook.xlsx.writeBuffer()
  return {
    dataUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${buffer.toString('base64')}`
  }
}

async function generateBulkUploadFile(data: OptimizationData) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Optimization logs');

  // Define Amazon Upload Format columns (exact order from C.2.1)
  sheet.columns = [
    { header: 'Product', key: 'product' },
    { header: 'Entity', key: 'entity' },
    { header: 'Operation', key: 'operation' },
    { header: 'Campaign ID', key: 'campaignId' },
    { header: 'Ad Group ID', key: 'adGroupId' },
    { header: 'Portfolio ID', key: 'portfolioId' },
    { header: 'Ad ID', key: 'adId' },
    { header: 'Keyword ID', key: 'keywordId' },
    { header: 'Product Targeting ID', key: 'productTargetingId' },
    { header: 'Campaign Name', key: 'campaignName' },
    { header: 'Ad Group Name', key: 'adGroupName' },
    { header: 'Start Date', key: 'startDate' },
    { header: 'End Date', key: 'endDate' },
    { header: 'Targeting Type', key: 'targetingType' },
    { header: 'State', key: 'state' },
    { header: 'Daily Budget', key: 'dailyBudget' },
    { header: 'SKU', key: 'sku' },
    { header: 'Ad Group Default Bid', key: 'adGroupDefaultBid' },
    { header: 'Bid', key: 'bid' },
    { header: 'Keyword Text', key: 'keywordText' },
    { header: 'Native Language Keyword', key: 'nativeLanguageKeyword' },
    { header: 'Native Language Locale', key: 'nativeLanguageLocale' },
    { header: 'Match Type', key: 'matchType' },
    { header: 'Bidding Strategy', key: 'biddingStrategy' },
    { header: 'Placement', key: 'placement' },
    { header: 'Percentage', key: 'percentage' },
    { header: 'Product Targeting Expression', key: 'productTargetingExpression' }
  ];

  const seen = new Set<string>();

  // Helper to create unique composite key
  const getCompositeKey = (row: any) => {
    return [
      row.entity,
      row.campaignId,
      row.adGroupId,
      row.productTargetingId,
      row.keywordId,
      row.placement,
      row.keywordText,
      row.productTargetingExpression,
      row.percentage // Added percentage to key
    ].join('|');
  };

  // C.3.1 - Product Targeting IDs
  data.productTargeting.forEach(entry => {
    if (!entry.newBid) return;

    const row = {
      product: 'Sponsored Products',
      entity: 'Product Targeting',
      operation: 'Update',
      campaignId: entry.campaignId,
      adGroupId: entry.adGroupId,
      productTargetingId: entry.id,
      state: 'enabled',
      bid: entry.newBid.toFixed(2)
    };

    const key = getCompositeKey(row);
    if (!seen.has(key)) {
      sheet.addRow(row);
      seen.add(key);
    }
  });

  // C.3.2 - Keyword IDs
  data.keywords.forEach(entry => {
    if (!entry.newBid) return;

    const row = {
      product: 'Sponsored Products',
      entity: 'Keyword',
      operation: 'Update',
      campaignId: entry.campaignId,
      adGroupId: entry.adGroupId,
      keywordId: entry.id,
      state: 'enabled',
      bid: entry.newBid
    };

    const key = getCompositeKey(row);
    if (!seen.has(key)) {
      sheet.addRow(row);
      seen.add(key);
    }
  });

  // C.3.3 - Placements
  data.placements.forEach(entry => {
    if (!entry.newBid) return;
  
    const row = {
      product: 'Sponsored Products',
      entity: 'Bidding Adjustment',
      operation: 'Update',
      campaignId: entry.campaignId,
      adGroupId: entry.adGroupId, // Added missing adGroupId
      placement: entry.placement,
      percentage: parseFloat(entry.newBid.toFixed(2)) // Ensure proper formatting
    };
  
    const key = getCompositeKey(row);
    if (!seen.has(key)) {
      sheet.addRow(row);
      seen.add(key);
    }
  });

  // C.3.4 - Negative Keywords & Targets
  data.negativeTerms.forEach(entry => {
    if (!entry.action) return

    const baseRow = {
      product: 'Sponsored Products',
      operation: 'Create',
      campaignId: entry.campaignId,
      adGroupId: entry.adGroupId,
      state: 'enabled'
    }

    // Use stored flags instead of recalculating
    if (entry.negProdYes) {
      const row = {
        ...baseRow,
        entity: 'Negative Product Targeting',
        productTargetingExpression: entry.formattedTerm
      }
      const key = getCompositeKey(row)
      if (!seen.has(key)) {
        sheet.addRow(row)
        seen.add(key)
      }
    } else if (entry.negKwYes) {
      const row = {
        ...baseRow,
        entity: 'Negative Keyword',
        keywordText: entry.term,
        matchType: 'negativeExact'
      }
      const key = getCompositeKey(row)
      if (!seen.has(key)) {
        sheet.addRow(row)
        seen.add(key)
      }
    }
  })

  // C.4.1 - Remove duplicates (final pass)
  const uniqueRows = new Map();
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const key = getCompositeKey(row.values);
    uniqueRows.set(key, row.values);
  });

  // Clear and repopulate with unique rows
  sheet.spliceRows(2, sheet.rowCount);
  uniqueRows.forEach(values => sheet.addRow(values));

  // C.4.1 - Ensure proper formatting
  sheet.eachRow(row => {
    row.eachCell(cell => {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  console.log(`Found ${data.placements.size} placements total`);
  console.log(`Generating ${seen.size} placement rows for bulk upload`);
  
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    dataUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${buffer.toString('base64')}`
  };
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

// Impact metrics calculation
function calculateImpactMetrics(data: OptimizationData) {
  const ptSavings = Array.from(data.productTargeting.values())
    .reduce((acc, pt) => acc + (pt.bid - (pt.newBid || pt.bid)) * pt.clicks, 0);
  
  const kwSavings = Array.from(data.keywords.values())
    .reduce((acc, kw) => acc + (kw.bid - (kw.newBid || kw.bid)) * kw.clicks, 0);
  
  const negSavings = Array.from(data.negativeTerms.values())
    .reduce((acc, nt) => nt.action ? acc + nt.spend : acc, 0);

  return [
    {
      metric: 'Estimated Monthly Savings',
      before: `$${(ptSavings + kwSavings + negSavings).toFixed(2)}`,
      after: `$${(ptSavings + kwSavings + negSavings).toFixed(2)}`,
      impact: 'Potential Savings'
    },
    {
      metric: 'Average ROAS Improvement',
      before: '0%',
      after: `${((ptSavings + kwSavings) / 100).toFixed(2)}%`,
      impact: 'ROAS Boost'
    },
    {
      metric: 'Negative Targets Identified',
      before: '0',
      after: data.negativeTerms.size.toString(),
      impact: 'Waste Prevention'
    }
  ];
}

async function generateImpactReportPDF(data: OptimizationData) {
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 72,
    font: 'public/fonts/Poppins-Regular.ttf'
  });
  const chunks: Uint8Array[] = [];
  const stream = new PassThrough();

  doc.pipe(stream);
  
  // Calculate impact metrics
  const impactMetrics = calculateImpactMetrics(data);

  // Title
  doc.fontSize(22)
     .fillColor('#000000')
     .text('Optimization Impact of Bidventor on Your Campaigns', { align: 'center' })
     .moveDown(0.5)
     .fontSize(14)
     .text('Leave Your Competition in the Dust with Bidventor', { align: 'center' })
     .moveDown(2);

  // Table setup
  const tableTop = 180;
  const colWidths = [180, 120, 120, 120]; // Adjusted column widths for proper fit
  const rowHeight = 25;

  // Table headers
  doc.fillColor('#ffffff')
     .rect(50, tableTop, 540, rowHeight)
     .fill('#232F3E')
     .fontSize(12)
     .fillColor('#ffffff')
     .text('Metric', 55, tableTop + 6, { width: colWidths[0], align: 'left' })
     .text('Before', 235, tableTop + 6, { width: colWidths[1], align: 'center' })
     .text('After', 355, tableTop + 6, { width: colWidths[2], align: 'center' })
     .text('Impact', 475, tableTop + 6, { width: colWidths[3], align: 'center' });

  let y = tableTop + rowHeight;
  doc.fillColor('#000000');

  impactMetrics.forEach((metric) => {
    doc.fontSize(10)
       .text(metric.metric, 55, y + 6, { width: colWidths[0], align: 'left' })
       .text(metric.before.toString(), 235, y + 6, { width: colWidths[1], align: 'center' })
       .text(metric.after.toString(), 355, y + 6, { width: colWidths[2], align: 'center' })
       .text(metric.impact.toString(), 475, y + 6, { width: colWidths[3], align: 'center' });

    doc.strokeColor('#dddddd').lineWidth(0.5).moveTo(50, y).lineTo(590, y).stroke();
    y += rowHeight;
  });
  const pageWidth = doc.page.width; // Get the page width
  const pageHeight = doc.page.height; // Get page height
  const footerWidth = 500; // Define a fixed width for text alignment
  const footerX = (pageWidth - footerWidth) / 2; // Center X position
  const footerY = pageHeight - 140; // Bottom margin
  // Footer
  doc.moveDown(2)
  .fontSize(10)
  .fillColor('#444444')
  .text('🚀 Unlock More Profit & Maximize ROAS Instantly!', 50, footerY, { width: footerWidth, align: 'center' })
  .moveDown(0.5)
  .text("💰 We guarantee you'll save money and boost ROAS within 30 days!", 50, doc.y, { width: footerWidth, align: 'center' })
  .moveDown(0.5)
  .text('✨ Bidventor = Effortless Growth. More Profit. Less Stress. ✨', 50, doc.y, { width: footerWidth, align: 'center' });

  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    stream.on('error', reject);
  });
}
