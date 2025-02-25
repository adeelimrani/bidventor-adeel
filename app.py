from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from io import BytesIO
import uuid
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import base64
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_impact_report(grouped_ptid, grouped_kwid, grouped_neg):
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    story = []

    bold_style = ParagraphStyle(
        'BoldStyle',
        parent=styles['Heading1'],
        fontSize=14,
        spaceAfter=20
    )

    # B.1 - Calculate estimates for Product Targeting IDs
    ptid_with_new_bid = grouped_ptid.dropna(subset=['PTID_New_Bid'])
    ptid_est_spend = (ptid_with_new_bid['PTID_New_Bid'] * ptid_with_new_bid['Clicks']).sum()
    ptid_est_sales = (ptid_est_spend * (ptid_with_new_bid['PTID_ROAS'] + 
                      (ptid_with_new_bid['PTID_ROAS'] * ptid_with_new_bid['PTID_DIFF_CPC'].abs()))).sum()
    ptid_est_roas = ptid_est_sales / ptid_est_spend if ptid_est_spend > 0 else 0

    # B.1 - Calculate estimates for Keyword IDs
    kwid_with_new_bid = grouped_kwid.dropna(subset=['KWID_New_Bid'])
    kwid_est_spend = (kwid_with_new_bid['KWID_New_Bid'] * kwid_with_new_bid['Clicks']).sum()
    kwid_est_sales = (kwid_est_spend * (kwid_with_new_bid['KWID_ROAS'] + 
                      (kwid_with_new_bid['KWID_ROAS'] * kwid_with_new_bid['KWID_DIFF_CPC'].abs()))).sum()
    kwid_est_roas = kwid_est_sales / kwid_est_spend if kwid_est_spend > 0 else 0

    # B.1 - Calculate estimates for Negative Keywords
    neg_filter = (grouped_neg['Clicks'] >= 10) & (grouped_neg['Units'] < 1)
    negkws_est_spend = grouped_neg[neg_filter]['Spend'].sum()

    # B.3 - Compute savings
    sum_spend_ptid_new_bid = grouped_ptid[grouped_ptid['PTID_New_Bid'].notna()]['Spend'].sum()
    sum_spend_kwid_new_bid = grouped_kwid[grouped_kwid['KWID_New_Bid'].notna()]['Spend'].sum()

    ptid_spend_savings = ptid_est_spend - sum_spend_ptid_new_bid
    kwid_spend_savings = kwid_est_spend - sum_spend_kwid_new_bid

    ptid_spend_savings_pct = ptid_spend_savings / (
        grouped_ptid['Spend'].sum()) if grouped_ptid['Spend'].sum() > 0 else 0
    kwid_spend_savings_pct = kwid_spend_savings / (
        grouped_kwid['Spend'].sum()) if grouped_kwid['Spend'].sum() > 0 else 0

    negkws_count = len(grouped_neg[neg_filter])

    # Generate PDF content
    story.append(Paragraph("OPPORTUNITIES", bold_style))
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        f"You are wasting {ptid_spend_savings_pct:.1%} ad spend currently.",
        styles['Normal']))
    story.append(Paragraph(
        f"• We found {len(ptid_with_new_bid)} opportunities that can save you ${ptid_spend_savings:.2f} by using Bidventor's formula in your Product Targeting IDs.",
        styles['Normal']))
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        f"You are wasting {kwid_spend_savings_pct:.1%} ad spend currently.",
        styles['Normal']))
    story.append(Paragraph(
        f"• We found {len(kwid_with_new_bid)} opportunities that can save you ${kwid_spend_savings:.2f} by using Bidventor's formula in your Keyword IDs.",
        styles['Normal']))
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        f"• We found {negkws_count} opportunities that can save you ${negkws_est_spend:.2f} by using Bidventor's proprietary optimization formula.",
        styles['Normal']))
    story.append(Spacer(1, 12))

    wasted_ad_spend = negkws_est_spend + ptid_spend_savings + kwid_spend_savings
    story.append(Paragraph(f"Overall you are wasting ${wasted_ad_spend:.2f}", bold_style))
    story.append(Paragraph("🌟Use Bidventor to Grow Your Profits on Amazon✨", bold_style))

    doc = SimpleDocTemplate(buffer, pagesize=letter)
    doc.build(story)
    buffer.seek(0)
    return buffer

def process_bidventor(file_content: bytes):
    try:
        xls = pd.ExcelFile(BytesIO(file_content))
        
        # Create in-memory buffers for outputs
        opt_log_buffer = BytesIO()
        amazon_upload_buffer = BytesIO()

        # ------- Product Targeting IDs Processing -------
        df_sp = pd.read_excel(xls, "Sponsored Products Campaigns")
        df_ptid = df_sp[(df_sp["Entity"] == "Product Targeting") & (df_sp["State"] == "enabled")]

        # Group and aggregate PTID data
        ptid_extra_cols = df_ptid.groupby("Product Targeting ID").agg({
            'Campaign ID': 'first',
            'Ad Group ID': 'first',
            'Campaign Name (Informational only)': 'first',
            'Ad Group Name (Informational only)': 'first',
            'Resolved Product Targeting Expression (Informational only)': 'first'
        }).reset_index()

        grouped_ptid = df_ptid.groupby("Product Targeting ID").agg({
            'Impressions': 'sum',
            'Clicks': 'sum',
            'Spend': 'sum',
            'Sales': 'sum',
            'Units': 'sum',
            'Bid': 'first',
            'Ad Group Default Bid (Informational only)': 'first'
        }).reset_index()

        grouped_ptid = pd.merge(grouped_ptid, ptid_extra_cols, on="Product Targeting ID")
        grouped_ptid["Bid"].fillna(grouped_ptid["Ad Group Default Bid (Informational only)"], inplace=True)

        # Calculate metrics
        grouped_ptid["PTID_ROAS"] = grouped_ptid.apply(
            lambda x: x["Sales"] / x["Spend"] if x["Spend"] > 0 else 0, axis=1)
        grouped_ptid["PTID_CPC"] = grouped_ptid.apply(
            lambda x: x["Spend"] / x["Clicks"] if x["Clicks"] > 0 else 0, axis=1)
        grouped_ptid["PTID_IDEAL_CPC"] = grouped_ptid.apply(
            lambda x: (x["Sales"] * 0.2) / x["Clicks"] if x["Clicks"] > 0 else 0, axis=1)
        grouped_ptid["PTID_DIFF_CPC"] = grouped_ptid.apply(
            lambda x: (x["PTID_IDEAL_CPC"] - x["PTID_CPC"]) / x["PTID_CPC"] if x["PTID_CPC"] > 0 else 0, axis=1)

        # Calculate new bids
        def calculate_ptid_new_bid(row):
            bid = row["Bid"]
            if pd.isna(bid) or bid == 0:
                return np.nan
            if row["PTID_DIFF_CPC"] < 0 and row["Units"] > 3:
                return max(0.02, bid + (bid * row["PTID_DIFF_CPC"]))
            if row["PTID_DIFF_CPC"] > 0:
                if 10 <= row["Units"] <= 50:
                    return bid + (bid * 0.0075)
                if 50 < row["Units"] <= 100:
                    return bid + (bid * 0.01)
                if row["Units"] > 100:
                    return bid + (bid * 0.02)
            return np.nan

        grouped_ptid["PTID_New_Bid"] = grouped_ptid.apply(calculate_ptid_new_bid, axis=1)

        # ------- Keyword IDs Processing -------
        df_kw = df_sp[(df_sp["Entity"] == "Keyword") & (df_sp["State"] == "enabled")]

        kwid_extra_cols = df_kw.groupby("Keyword ID").agg({
            'Campaign ID': 'first',
            'Ad Group ID': 'first',
            'Campaign Name (Informational only)': 'first',
            'Ad Group Name (Informational only)': 'first',
            'Resolved Product Targeting Expression (Informational only)': 'first'
        }).reset_index()

        grouped_kwid = df_kw.groupby("Keyword ID").agg({
            'Impressions': 'sum',
            'Clicks': 'sum',
            'Spend': 'sum',
            'Sales': 'sum',
            'Units': 'sum',
            'Bid': 'first',
            'Ad Group Default Bid (Informational only)': 'first'
        }).reset_index()

        grouped_kwid = pd.merge(grouped_kwid, kwid_extra_cols, on="Keyword ID")
        grouped_kwid["Bid"].fillna(grouped_kwid["Ad Group Default Bid (Informational only)"], inplace=True)

        # Calculate metrics
        grouped_kwid["KWID_ROAS"] = grouped_kwid.apply(
            lambda x: x["Sales"] / x["Spend"] if x["Spend"] > 0 else 0, axis=1)
        grouped_kwid["KWID_CPC"] = grouped_kwid.apply(
            lambda x: x["Spend"] / x["Clicks"] if x["Clicks"] > 0 else 0, axis=1)
        grouped_kwid["KWID_IDEAL_CPC"] = grouped_kwid.apply(
            lambda x: (x["Sales"] * 0.2) / x["Clicks"] if x["Clicks"] > 0 else 0, axis=1)
        grouped_kwid["KWID_DIFF_CPC"] = grouped_kwid.apply(
            lambda x: (x["KWID_IDEAL_CPC"] - x["KWID_CPC"]) / x["KWID_CPC"] if x["KWID_CPC"] > 0 else 0, axis=1)

        # Calculate new bids
        def calculate_kwid_new_bid(row):
            bid = row["Bid"]
            if pd.isna(bid) or bid == 0:
                return np.nan
            if row["KWID_DIFF_CPC"] < 0 and row["Units"] > 3:
                return max(0.02, bid + (bid * row["KWID_DIFF_CPC"]))
            if row["KWID_DIFF_CPC"] > 0:
                if 10 <= row["Units"] <= 50:
                    return bid + (bid * 0.0075)
                if 50 < row["Units"] <= 100:
                    return bid + (bid * 0.01)
                if row["Units"] > 100:
                    return bid + (bid * 0.02)
            return np.nan

        grouped_kwid["KWID_New_Bid"] = grouped_kwid.apply(calculate_kwid_new_bid, axis=1)

        # ------- Placements Processing -------
        df_placements = df_sp[(df_sp["Entity"] == "Bidding Adjustment") & 
                            (df_sp["Campaign State (Informational only)"] == "enabled")]

        grouped_placements = df_placements.groupby(
            ["Placement", "Percentage", "Campaign ID"]
        ).agg({
            'Impressions': 'sum',
            'Clicks': 'sum',
            'Spend': 'sum',
            'Sales': 'sum',
            'Units': 'sum',
            'Campaign Name (Informational only)': 'first'
        }).reset_index()

        # Calculate placement metrics
        grouped_placements["PLCMT_ROAS"] = grouped_placements.apply(
            lambda x: x["Sales"] / x["Spend"] if x["Spend"] > 0 else 0, axis=1)
        grouped_placements["PLCMT_CPC"] = grouped_placements.apply(
            lambda x: x["Spend"] / x["Clicks"] if x["Clicks"] > 0 else 0, axis=1)
        grouped_placements["PLCMT_IDEAL_CPC"] = grouped_placements.apply(
            lambda x: (x["Sales"] * 0.2) / x["Clicks"] if x["Clicks"] > 0 else 0, axis=1)
        grouped_placements["PLCMT_DIFF_CPC"] = grouped_placements.apply(
            lambda x: (x["PLCMT_IDEAL_CPC"] - x["PLCMT_CPC"]) / x["PLCMT_CPC"] if x["PLCMT_CPC"] > 0 else 0, axis=1)

        # Calculate new placement bids
        def calculate_plcmt_new_bid(row):
            plcmt_diff_cpc = row["PLCMT_DIFF_CPC"]
            units = row["Units"]
            percentage = row["Percentage"]

            if plcmt_diff_cpc <= 0 or units < 3:
                return np.nan

            new_bid = None
            if percentage != 0:
                if 3 <= units <= 10:
                    new_bid = percentage + (percentage * (plcmt_diff_cpc / 5))
                elif 10 < units <= 30:
                    new_bid = percentage + (percentage * (plcmt_diff_cpc / 4))
                elif 30 < units <= 50:
                    new_bid = percentage + (percentage * (plcmt_diff_cpc / 3))
                elif units > 50:
                    new_bid = percentage + (percentage * (plcmt_diff_cpc / 2))
            else:
                if 3 <= units <= 10:
                    new_bid = (plcmt_diff_cpc * 100) / 5
                elif 10 < units <= 30:
                    new_bid = (plcmt_diff_cpc * 100) / 4
                elif 30 < units <= 50:
                    new_bid = (plcmt_diff_cpc * 100) / 3
                elif units > 50:
                    new_bid = (plcmt_diff_cpc * 100) / 2

            return min(899, new_bid) if new_bid else np.nan

        grouped_placements["PLCMT_New_Bid"] = grouped_placements.apply(calculate_plcmt_new_bid, axis=1)

        # ------- Negative Keywords Processing -------
        df_neg = pd.read_excel(xls, "SP Search Term Report")
        df_neg = df_neg[df_neg["Campaign State (Informational only)"] == "enabled"]

        grouped_neg = df_neg.groupby([
            "Customer Search Term", "Campaign ID", "Ad Group ID"
        ]).agg({
            'Impressions': 'sum',
            'Clicks': 'sum',
            'Spend': 'sum',
            'Sales': 'sum',
            'Units': 'sum',
            'Campaign Name (Informational only)': 'first',
            'Ad Group Name (Informational only)': 'first'
        }).reset_index()

        grouped_neg["NEGKWS_ROAS"] = grouped_neg.apply(
            lambda x: x["Sales"] / x["Spend"] if x["Spend"] > 0 else 0, axis=1)
        grouped_neg["NEGKWS_CPC"] = grouped_neg.apply(
            lambda x: x["Spend"] / x["Clicks"] if x["Clicks"] > 0 else 0, axis=1)
        grouped_neg["NEG_KW_YES"] = ~grouped_neg["Customer Search Term"].str.startswith("b0", na=False)
        grouped_neg["NEG_PROD_YES"] = grouped_neg["Customer Search Term"].str.startswith("b0", na=False)
        grouped_neg["Product Targeting Expression"] = grouped_neg.apply(
            lambda x: f'asin="{x["Customer Search Term"]}"' if x["NEG_PROD_YES"] else "", axis=1)
        grouped_neg["Bidventor Action"] = np.where(
            (grouped_neg["Clicks"] >= 10) & (grouped_neg["Units"] < 1),
            "To be added as Negative Search term to avoid wasted ad spend",
            ""
        )

        # ------- Create Optimization Log -------
        with pd.ExcelWriter(opt_log_buffer) as writer:
            grouped_ptid.to_excel(writer, sheet_name="Product Targeting IDs", index=False)
            grouped_kwid.to_excel(writer, sheet_name="Keyword ID", index=False)
            grouped_placements.to_excel(writer, sheet_name="Placements", index=False)
            grouped_neg.to_excel(writer, sheet_name="Negative KWs & Targets", index=False)

        # ------- Create Amazon Upload File -------
        amazon_upload = pd.DataFrame(columns=[
            "Product", "Entity", "Operation", "Campaign ID", "Ad Group ID",
            "Portfolio ID", "Ad ID", "Keyword ID", "Product Targeting ID",
            "Campaign Name", "Ad Group Name", "Start Date", "End Date",
            "Targeting Type", "State", "Daily Budget", "SKU",
            "Ad Group Default Bid", "Bid", "Keyword Text",
            "Native Language Keyword", "Native Language Locale", "Match Type",
            "Bidding Strategy", "Placement", "Percentage",
            "Product Targeting Expression"
        ])

        # Add Product Targeting updates
        pt_rows = grouped_ptid.dropna(subset=["PTID_New_Bid"]).copy()
        if not pt_rows.empty:
            pt_rows["Product"] = "Sponsored Products"
            pt_rows["Entity"] = "Product Targeting"
            pt_rows["Operation"] = "Update"
            pt_rows["State"] = "enabled"
            pt_rows["Bid"] = pt_rows["PTID_New_Bid"]
            amazon_upload = pd.concat([amazon_upload, pt_rows[amazon_upload.columns.intersection(pt_rows.columns)]])

        # Add Keyword updates
        kw_rows = grouped_kwid.dropna(subset=["KWID_New_Bid"]).copy()
        if not kw_rows.empty:
            kw_rows["Product"] = "Sponsored Products"
            kw_rows["Entity"] = "Keyword"
            kw_rows["Operation"] = "Update"
            kw_rows["State"] = "enabled"
            kw_rows["Bid"] = kw_rows["KWID_New_Bid"]
            amazon_upload = pd.concat([amazon_upload, kw_rows[amazon_upload.columns.intersection(kw_rows.columns)]])

        # Add Placement updates
        plcmt_rows = grouped_placements.dropna(subset=["PLCMT_New_Bid"]).copy()
        if not plcmt_rows.empty:
            plcmt_rows["Product"] = "Sponsored Products"
            plcmt_rows["Entity"] = "Bidding Adjustment"
            plcmt_rows["Operation"] = "Update"
            plcmt_rows["Percentage"] = plcmt_rows["PLCMT_New_Bid"]
            amazon_upload = pd.concat([amazon_upload, plcmt_rows[amazon_upload.columns.intersection(plcmt_rows.columns)]])

        # Add Negative Keywords
        neg_filter = (grouped_neg["Clicks"] >= 10) & (grouped_neg["Units"] < 1)
        neg_kw_rows = grouped_neg[neg_filter & grouped_neg["NEG_KW_YES"]].copy()
        if not neg_kw_rows.empty:
            neg_kw_rows["Product"] = "Sponsored Products"
            neg_kw_rows["Entity"] = "Negative Keyword"
            neg_kw_rows["Operation"] = "Create"
            neg_kw_rows["State"] = "enabled"
            neg_kw_rows["Match Type"] = "negativeExact"
            neg_kw_rows["Keyword Text"] = neg_kw_rows["Customer Search Term"]
            amazon_upload = pd.concat([amazon_upload, neg_kw_rows[amazon_upload.columns.intersection(neg_kw_rows.columns)]])

        # Add Negative Product Targeting
        neg_prod_rows = grouped_neg[neg_filter & grouped_neg["NEG_PROD_YES"]].copy()
        if not neg_prod_rows.empty:
            neg_prod_rows["Product"] = "Sponsored Products"
            neg_prod_rows["Entity"] = "Negative Product Targeting"
            neg_prod_rows["Operation"] = "Create"
            neg_prod_rows["State"] = "enabled"
            amazon_upload = pd.concat([amazon_upload, neg_prod_rows[amazon_upload.columns.intersection(neg_prod_rows.columns)]])

        # Save Amazon Upload file
        amazon_upload = amazon_upload.drop_duplicates()
        ordered_cols = [col for col in amazon_upload.columns if col in amazon_upload]
        amazon_upload = amazon_upload[ordered_cols]
        with pd.ExcelWriter(amazon_upload_buffer) as writer:
            amazon_upload.to_excel(writer, sheet_name="Sponsored Products Campaigns", index=False)

        # Generate Impact Report
        impact_report_buffer = generate_impact_report(grouped_ptid, grouped_kwid, grouped_neg)

        # Convert buffers to data URLs
        def get_data_url(buffer, mime_type):
            buffer.seek(0)
            b64 = base64.b64encode(buffer.read()).decode()
            return f"data:{mime_type};base64,{b64}"

        return {
            "success": True,
            "files": {
                "Optimization_Log.xlsx": get_data_url(opt_log_buffer, 
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                "Amazon_Upload.xlsx": get_data_url(amazon_upload_buffer, 
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                "Impact_Report.pdf": get_data_url(impact_report_buffer, 
                    "application/pdf")
            }
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(400, detail="Invalid file type. Please upload .xlsx")

    try:
        logger.info(f"Processing file: {file.filename}")
        content = await file.read()
        result = process_bidventor(content)
        
        if result['success']:
            return result
        else:
            logger.error(f"Processing error: {result['error']}")
            raise HTTPException(400, detail=result['error'])
            
    except Exception as e:
        
        logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        raise HTTPException(500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)