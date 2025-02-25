from flask import Flask, jsonify, request, send_file
import pandas as pd
import numpy as np
import os
import uuid
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 300 * 1024 * 1024  # 300MB max limit



def generate_impact_report(output_dir, grouped_ptid, grouped_kwid,
                           grouped_neg):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    pdf_path = os.path.join(output_dir, 'Impact_Report.pdf')
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Create custom style for bold headers
    bold_style = ParagraphStyle('BoldStyle',
                                parent=styles['Heading1'],
                                fontSize=14,
                                spaceAfter=20)

    # B.1 - Calculate estimates for Product Targeting IDs
    ptid_with_new_bid = grouped_ptid.dropna(subset=['PTID_New_Bid'])
    ptid_est_spend = (ptid_with_new_bid['PTID_New_Bid'] *
                      ptid_with_new_bid['Clicks']).sum()
    ptid_est_sales = (ptid_est_spend *
                      (ptid_with_new_bid['PTID_ROAS'] +
                       (ptid_with_new_bid['PTID_ROAS'] *
                        ptid_with_new_bid['PTID_DIFF_CPC'].abs()))).sum()
    ptid_est_roas = ptid_est_sales / ptid_est_spend if ptid_est_spend > 0 else 0

    # B.1 - Calculate estimates for Keyword IDs
    kwid_with_new_bid = grouped_kwid.dropna(subset=['KWID_New_Bid'])
    kwid_est_spend = (kwid_with_new_bid['KWID_New_Bid'] *
                      kwid_with_new_bid['Clicks']).sum()
    kwid_est_sales = (kwid_est_spend *
                      (kwid_with_new_bid['KWID_ROAS'] +
                       (kwid_with_new_bid['KWID_ROAS'] *
                        kwid_with_new_bid['KWID_DIFF_CPC'].abs()))).sum()
    kwid_est_roas = kwid_est_sales / kwid_est_spend if kwid_est_spend > 0 else 0

    # B.1 - Calculate estimates for Negative Keywords
    neg_filter = (grouped_neg['Clicks'] >= 10) & (grouped_neg['Units'] < 1)
    negkws_est_spend = grouped_neg[neg_filter]['Spend'].sum()

    # B.2 - Categorize and calculate metrics
    ptid_no_new_bid = grouped_ptid[grouped_ptid['PTID_New_Bid'].isna()]
    sum_spend_non_ptid_new_bid = ptid_no_new_bid['Spend'].sum()
    sum_sales_non_ptid_new_bid = ptid_no_new_bid['Sales'].sum()
    roas_non_ptid_new_bid = sum_sales_non_ptid_new_bid / sum_spend_non_ptid_new_bid if sum_spend_non_ptid_new_bid > 0 else 0

    sum_spend_ptid_new_bid = ptid_with_new_bid['Spend'].sum()
    sum_sales_ptid_new_bid = ptid_with_new_bid['Sales'].sum()
    roas_ptid_new_bid = sum_sales_ptid_new_bid / sum_spend_ptid_new_bid if sum_spend_ptid_new_bid > 0 else 0

    kwid_no_new_bid = grouped_kwid[grouped_kwid['KWID_New_Bid'].isna()]
    sum_spend_non_kwid_new_bid = kwid_no_new_bid['Spend'].sum()
    sum_sales_non_kwid_new_bid = kwid_no_new_bid['Sales'].sum()
    roas_non_kwid_new_bid = sum_sales_non_kwid_new_bid / sum_spend_non_kwid_new_bid if sum_spend_non_kwid_new_bid > 0 else 0

    sum_spend_kwid_new_bid = kwid_with_new_bid['Spend'].sum()
    sum_sales_kwid_new_bid = kwid_with_new_bid['Sales'].sum()
    roas_kwid_new_bid = sum_sales_kwid_new_bid / sum_spend_kwid_new_bid if sum_spend_kwid_new_bid > 0 else 0

    # B.3 - Compute savings
    sum_spend_ptid_new_bid = grouped_ptid[
        grouped_ptid['PTID_New_Bid'].notna()]['Spend'].sum()
    sum_spend_kwid_new_bid = grouped_kwid[
        grouped_kwid['KWID_New_Bid'].notna()]['Spend'].sum()

    ptid_spend_savings = ptid_est_spend - sum_spend_ptid_new_bid
    kwid_spend_savings = kwid_est_spend - sum_spend_kwid_new_bid

    ptid_spend_savings_pct = ptid_spend_savings / (
        sum_spend_non_ptid_new_bid + sum_spend_ptid_new_bid) if (
            sum_spend_non_ptid_new_bid + sum_spend_ptid_new_bid) > 0 else 0
    kwid_spend_savings_pct = kwid_spend_savings / (
        sum_spend_non_kwid_new_bid + sum_spend_kwid_new_bid) if (
            sum_spend_non_kwid_new_bid + sum_spend_kwid_new_bid) > 0 else 0

    negkws_count = len(grouped_neg[neg_filter])
    negkws_count_false = len(grouped_neg[~neg_filter])

    # B.4 - Generate PDF content
    story.append(Paragraph("OPPORTUNITIES", bold_style))
    story.append(Spacer(1, 12))

    # Product Targeting IDs section
    story.append(
        Paragraph(
            f"You are wasting {ptid_spend_savings_pct:.1%} ad spend currently.",
            styles['Normal']))
    story.append(
        Paragraph(
            f"• We found {len(ptid_with_new_bid)} opportunities that can save you ${ptid_spend_savings:.2f} by using Bidventor's formula in your Product Targeting IDs.",
            styles['Normal']))
    story.append(Spacer(1, 12))

    # Keyword IDs section
    story.append(
        Paragraph(
            f"You are wasting {kwid_spend_savings_pct:.1%} ad spend currently.",
            styles['Normal']))
    story.append(
        Paragraph(
            f"• We found {len(kwid_with_new_bid)} opportunities that can save you ${kwid_spend_savings:.2f} by using Bidventor's formula in your Keyword IDs.",
            styles['Normal']))
    story.append(Spacer(1, 12))

    # Negative Keywords & Targets section
    story.append(
        Paragraph(
            f"• We found {negkws_count} opportunities that can save you ${negkws_est_spend:.2f} by using Bidventor's proprietary optimization formula.",
            styles['Normal']))
    story.append(Spacer(1, 12))

    # Overall message
    wasted_ad_spend = negkws_est_spend + ptid_spend_savings + kwid_spend_savings
    story.append(
        Paragraph(f"Overall you are wasting ${wasted_ad_spend:.2f}",
                  bold_style))
    story.append(
        Paragraph("🌟Use Bidventor to Grow Your Profits on Amazon✨",
                  bold_style))

    doc.build(story)
    return pdf_path


def process_bidventor(file_path, output_dir):
    """Processes Amazon Sponsored Products Campaigns file and optimizes bids."""
    try:
        # Load the Excel file
        xls = pd.ExcelFile(file_path)
        output_dir = app.config['UPLOAD_FOLDER']
        opt_log_path = os.path.join(output_dir, 'Optimization_Log.xlsx')
        amazon_upload_path = os.path.join(output_dir, 'Amazon_Upload.xlsx')

        # Create optimization log Excel file
        with pd.ExcelWriter(opt_log_path) as writer:
            # Step A: Optimization Log - Product Targeting ID
            df_sp = pd.read_excel(xls, "Sponsored Products Campaigns")
            df_ptid = df_sp[(df_sp["Entity"] == "Product Targeting")
                            & (df_sp["State"] == "enabled")]

            ptid_extra_cols = df_ptid.groupby("Product Targeting ID").agg({
                "Campaign ID":
                "first",
                "Ad Group ID":
                "first",
                "Campaign Name (Informational only)":
                "first",
                "Ad Group Name (Informational only)":
                "first",
                "Resolved Product Targeting Expression (Informational only)":
                "first"
            }).reset_index()

            grouped_ptid = df_ptid.groupby("Product Targeting ID").agg({
                "Impressions":
                "sum",
                "Clicks":
                "sum",
                "Spend":
                "sum",
                "Sales":
                "sum",
                "Units":
                "sum",
                "Bid":
                "first",
                "Ad Group Default Bid (Informational only)":
                "first"
            }).reset_index()

            grouped_ptid = pd.merge(grouped_ptid,
                                    ptid_extra_cols,
                                    on="Product Targeting ID")
            grouped_ptid["Bid"].fillna(
                grouped_ptid["Ad Group Default Bid (Informational only)"],
                inplace=True)

            grouped_ptid["PTID_ROAS"] = grouped_ptid.apply(
                lambda x: x["Sales"] / x["Spend"] if x["Spend"] > 0 else 0,
                axis=1)
            grouped_ptid["PTID_CPC"] = grouped_ptid.apply(
                lambda x: x["Spend"] / x["Clicks"] if x["Clicks"] > 0 else 0,
                axis=1)
            grouped_ptid["PTID_IDEAL_CPC"] = grouped_ptid.apply(
                lambda x: (x["Sales"] * 0.2) / x["Clicks"]
                if x["Clicks"] > 0 else 0,
                axis=1)
            grouped_ptid["PTID_DIFF_CPC"] = grouped_ptid.apply(
                lambda x: (x["PTID_IDEAL_CPC"] - x["PTID_CPC"]) / x["PTID_CPC"]
                if x["PTID_CPC"] > 0 else 0,
                axis=1)

            def calculate_ptid_new_bid(row):
                bid = row["Bid"]
                if pd.isna(bid) or bid == 0:
                    return np.nan

                if row["PTID_DIFF_CPC"] < 0 and row["Units"] > 3:
                    return max(0.02, bid + (bid * row["PTID_DIFF_CPC"]))
                if row["PTID_DIFF_CPC"] > 0:
                    if 10 <= row["Units"] <= 50:
                        return bid + (bid * 0.0075)  # 0.75%
                    if 50 < row["Units"] <= 100:
                        return bid + (bid * 0.01)  # 1%
                    if row["Units"] > 100:
                        return bid + (bid * 0.02)  # 2%
                return np.nan

            grouped_ptid["PTID_New_Bid"] = grouped_ptid.apply(
                calculate_ptid_new_bid, axis=1)
            grouped_ptid.to_excel(writer,
                                  sheet_name="Product Targeting IDs",
                                  index=False)

            # Step AB: Optimization Log - Keyword ID
            df_kw = df_sp[(df_sp["Entity"] == "Keyword")
                          & (df_sp["State"] == "enabled")]

            kwid_extra_cols = df_kw.groupby("Keyword ID").agg({
                "Campaign ID":
                "first",
                "Ad Group ID":
                "first",
                "Campaign Name (Informational only)":
                "first",
                "Ad Group Name (Informational only)":
                "first",
                "Resolved Product Targeting Expression (Informational only)":
                "first"
            }).reset_index()

            grouped_kwid = df_kw.groupby("Keyword ID").agg({
                "Impressions":
                "sum",
                "Clicks":
                "sum",
                "Spend":
                "sum",
                "Sales":
                "sum",
                "Units":
                "sum",
                "Bid":
                "first",
                "Ad Group Default Bid (Informational only)":
                "first"
            }).reset_index()

            grouped_kwid = pd.merge(grouped_kwid,
                                    kwid_extra_cols,
                                    on="Keyword ID")
            grouped_kwid["Bid"].fillna(
                grouped_kwid["Ad Group Default Bid (Informational only)"],
                inplace=True)

            grouped_kwid["KWID_ROAS"] = grouped_kwid.apply(
                lambda x: x["Sales"] / x["Spend"] if x["Spend"] > 0 else 0,
                axis=1)
            grouped_kwid["KWID_CPC"] = grouped_kwid.apply(
                lambda x: x["Spend"] / x["Clicks"] if x["Clicks"] > 0 else 0,
                axis=1)
            grouped_kwid["KWID_IDEAL_CPC"] = grouped_kwid.apply(
                lambda x: (x["Sales"] * 0.2) / x["Clicks"]
                if x["Clicks"] > 0 else 0,
                axis=1)
            grouped_kwid["KWID_DIFF_CPC"] = grouped_kwid.apply(
                lambda x: (x["KWID_IDEAL_CPC"] - x["KWID_CPC"]) / x["KWID_CPC"]
                if x["KWID_CPC"] > 0 else 0,
                axis=1)

            def calculate_kwid_new_bid(row):
                bid = row["Bid"]
                if pd.isna(bid) or bid == 0:
                    return np.nan

                if row["KWID_DIFF_CPC"] < 0 and row["Units"] > 3:
                    return max(0.02, bid + (bid * row["KWID_DIFF_CPC"]))
                if row["KWID_DIFF_CPC"] > 0:
                    if 10 <= row["Units"] <= 50:
                        return bid + (bid * 0.0075)  # 0.75%
                    if 50 < row["Units"] <= 100:
                        return bid + (bid * 0.01)  # 1%
                    if row["Units"] > 100:
                        return bid + (bid * 0.02)  # 2%
                return np.nan

            grouped_kwid["KWID_New_Bid"] = grouped_kwid.apply(
                calculate_kwid_new_bid, axis=1)
            grouped_kwid.to_excel(writer, sheet_name="Keyword ID", index=False)

            # Step ABC: Placements
            df_placements = df_sp[(df_sp["Entity"] == "Bidding Adjustment") & (
                df_sp["Campaign State (Informational only)"] == "enabled")]

            grouped_placements = df_placements.groupby(
                ["Placement", "Percentage", "Campaign ID"]).agg({
                    "Impressions":
                    "sum",
                    "Clicks":
                    "sum",
                    "Spend":
                    "sum",
                    "Sales":
                    "sum",
                    "Units":
                    "sum",
                    "Campaign Name (Informational only)":
                    "first"
                }).reset_index()

            grouped_placements["PLCMT_ROAS"] = grouped_placements.apply(
                lambda x: x["Sales"] / x["Spend"] if x["Spend"] > 0 else 0,
                axis=1)
            grouped_placements["PLCMT_CPC"] = grouped_placements.apply(
                lambda x: x["Spend"] / x["Clicks"] if x["Clicks"] > 0 else 0,
                axis=1)
            grouped_placements["PLCMT_IDEAL_CPC"] = grouped_placements.apply(
                lambda x: (x["Sales"] * 0.2) / x["Clicks"]
                if x["Clicks"] > 0 else 0,
                axis=1)
            grouped_placements["PLCMT_DIFF_CPC"] = grouped_placements.apply(
                lambda x:
                (x["PLCMT_IDEAL_CPC"] - x["PLCMT_CPC"]) / x["PLCMT_CPC"]
                if x["PLCMT_CPC"] > 0 else 0,
                axis=1)

            def calculate_plcmt_new_bid(row):
                plcmt_diff_cpc = row["PLCMT_DIFF_CPC"]
                units = row["Units"]
                percentage = row["Percentage"]

                if plcmt_diff_cpc <= 0 or units < 3:
                    return np.nan

                new_bid = None

                if percentage != 0:
                    if 3 <= units <= 10:
                        new_bid = percentage + (percentage *
                                                (plcmt_diff_cpc / 5))
                    elif 10 < units <= 30:
                        new_bid = percentage + (percentage *
                                                (plcmt_diff_cpc / 4))
                    elif 30 < units <= 50:
                        new_bid = percentage + (percentage *
                                                (plcmt_diff_cpc / 3))
                    elif units > 50:
                        new_bid = percentage + (percentage *
                                                (plcmt_diff_cpc / 2))
                else:
                    if 3 <= units <= 10:
                        new_bid = (plcmt_diff_cpc * 100) / 5
                    elif 10 < units <= 30:
                        new_bid = (plcmt_diff_cpc * 100) / 4
                    elif 30 < units <= 50:
                        new_bid = (plcmt_diff_cpc * 100) / 3
                    elif units > 50:
                        new_bid = (plcmt_diff_cpc * 100) / 2

                if new_bid is not None:
                    return min(899, new_bid)
                return np.nan

            grouped_placements["PLCMT_New_Bid"] = grouped_placements.apply(
                calculate_plcmt_new_bid, axis=1)
            grouped_placements.to_excel(writer,
                                        sheet_name="Placements",
                                        index=False)

            # Step ABCD: Negative Keywords & Targets
            df_neg = pd.read_excel(xls, "SP Search Term Report")
            df_neg = df_neg[df_neg["Campaign State (Informational only)"] ==
                            "enabled"]

            grouped_neg = df_neg.groupby(
                ["Customer Search Term", "Campaign ID", "Ad Group ID"]).agg({
                    "Impressions":
                    "sum",
                    "Clicks":
                    "sum",
                    "Spend":
                    "sum",
                    "Sales":
                    "sum",
                    "Units":
                    "sum",
                    "Campaign Name (Informational only)":
                    "first",
                    "Ad Group Name (Informational only)":
                    "first"
                }).reset_index()

            grouped_neg["NEGKWS_ROAS"] = grouped_neg.apply(
                lambda x: x["Sales"] / x["Spend"] if x["Spend"] > 0 else 0,
                axis=1)
            grouped_neg["NEGKWS_CPC"] = grouped_neg.apply(
                lambda x: x["Spend"] / x["Clicks"] if x["Clicks"] > 0 else 0,
                axis=1)

            grouped_neg["NEG_KW_YES"] = ~grouped_neg[
                "Customer Search Term"].str.startswith("b0", na=False)
            grouped_neg["NEG_PROD_YES"] = grouped_neg[
                "Customer Search Term"].str.startswith("b0", na=False)

            grouped_neg["Product Targeting Expression"] = grouped_neg.apply(
                lambda x: f'asin="{x["Customer Search Term"]}"'
                if x["NEG_PROD_YES"] else "",
                axis=1)

            grouped_neg["Bidventor Action"] = np.where(
                (grouped_neg["Clicks"] >= 10) & (grouped_neg["Units"] < 1),
                "To be added as Negative Search term to avoid wasted ad spend",
                "")

            grouped_neg.to_excel(writer,
                                 sheet_name="Negative KWs & Targets",
                                 index=False)

        # Step C: Generate Amazon Upload File
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

        # Product Targeting
        pt_rows = grouped_ptid.dropna(subset=["PTID_New_Bid"]).copy()
        if not pt_rows.empty:
            pt_rows["Product"] = "Sponsored Products"
            pt_rows["Entity"] = "Product Targeting"
            pt_rows["Operation"] = "Update"
            pt_rows["State"] = "enabled"
            pt_rows["Bid"] = pt_rows["PTID_New_Bid"]
            amazon_upload = pd.concat([
                amazon_upload,
                pt_rows[amazon_upload.columns.intersection(pt_rows.columns)]
            ])

        # Keywords
        kw_rows = grouped_kwid.dropna(subset=["KWID_New_Bid"]).copy()
        if not kw_rows.empty:
            kw_rows["Product"] = "Sponsored Products"
            kw_rows["Entity"] = "Keyword ID"
            kw_rows["Operation"] = "Update"
            kw_rows["State"] = "enabled"
            kw_rows["Bid"] = kw_rows["KWID_New_Bid"]
            amazon_upload = pd.concat([
                amazon_upload,
                kw_rows[amazon_upload.columns.intersection(kw_rows.columns)]
            ])

        # Placements
        plcmt_rows = grouped_placements.dropna(subset=["PLCMT_New_Bid"]).copy()
        if not plcmt_rows.empty:
            plcmt_rows["Product"] = "Sponsored Products"
            plcmt_rows["Entity"] = "Bidding Adjustment"
            plcmt_rows["Operation"] = "Update"
            plcmt_rows["Percentage"] = plcmt_rows["PLCMT_New_Bid"]
            amazon_upload = pd.concat([
                amazon_upload, plcmt_rows[amazon_upload.columns.intersection(
                    plcmt_rows.columns)]
            ])

        # Negative Keywords & Targets
        neg_filter = (grouped_neg["Clicks"] >= 10) & (grouped_neg["Units"] < 1)

        # Negative Keywords
        neg_kw_rows = grouped_neg[neg_filter
                                  & grouped_neg["NEG_KW_YES"]].copy()
        if not neg_kw_rows.empty:
            neg_kw_rows["Product"] = "Sponsored Products"
            neg_kw_rows["Entity"] = "Negative Keyword"
            neg_kw_rows["Operation"] = "Create"
            neg_kw_rows["State"] = "enabled"
            neg_kw_rows["Match Type"] = "negativeExact"
            neg_kw_rows["Keyword Text"] = neg_kw_rows["Customer Search Term"]
            amazon_upload = pd.concat([
                amazon_upload, neg_kw_rows[amazon_upload.columns.intersection(
                    neg_kw_rows.columns)]
            ])

        # Negative Product Targeting
        neg_prod_rows = grouped_neg[neg_filter
                                    & grouped_neg["NEG_PROD_YES"]].copy()
        if not neg_prod_rows.empty:
            neg_prod_rows["Product"] = "Sponsored Products"
            neg_prod_rows["Entity"] = "Negative Product Targeting"
            neg_prod_rows["Operation"] = "Create"
            neg_prod_rows["State"] = "enabled"
            amazon_upload = pd.concat([
                amazon_upload,
                neg_prod_rows[amazon_upload.columns.intersection(
                    neg_prod_rows.columns)]
            ])

        # Remove duplicates and save
        amazon_upload = amazon_upload.drop_duplicates()
        ordered_cols = [
            col for col in amazon_upload.columns if col in amazon_upload
        ]
        amazon_upload = amazon_upload[ordered_cols]
        amazon_upload.to_excel(amazon_upload_path,
                               sheet_name="Sponsored Products Campaigns",
                               index=False)

        # Generate PDF Impact Report
        impact_report_path = generate_impact_report(output_dir, grouped_ptid,
                                                    grouped_kwid, grouped_neg)

        return True, "Processing Complete"
    except Exception as e:
        return False, str(e)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    if file and file.filename.endswith('.xlsx'):
        try:
            # Create unique upload directory
            upload_id = uuid.uuid4().hex
            output_dir = os.path.join(app.config['UPLOAD_FOLDER'], upload_id)
            os.makedirs(output_dir, exist_ok=True)

            # Save uploaded file
            filename = secure_filename(file.filename)
            filepath = os.path.join(output_dir, filename)
            
            # Save in chunks
            CHUNK_SIZE = 8192
            with open(filepath, 'wb') as f:
                while True:
                    chunk = file.stream.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    f.write(chunk)

            # Process file with timeout
            from concurrent.futures import ThreadPoolExecutor, TimeoutError
            with ThreadPoolExecutor() as executor:
                future = executor.submit(process_bidventor, filepath, output_dir)
                try:
                    success, message = future.result(timeout=900)
                    if success:
                        return jsonify({
                            'success': True,
                            'message': message,
                            'uploadId': upload_id,
                            'files': [
                                'Optimization_Log.xlsx',
                                'Amazon_Upload.xlsx',
                                'Impact_Report.pdf'
                            ]
                        })
                    else:
                        return jsonify({'success': False, 'error': message}), 400
                except TimeoutError:
                    return jsonify({'success': False, 'error': 'Processing timeout'}), 408
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    else:
        return jsonify({'success': False, 'error': 'Invalid file type. Please upload .xlsx'}), 400

@app.route('/download/<upload_id>/<filename>')
def download_file(upload_id, filename):
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], upload_id, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404

        mimetype = 'application/pdf' if filename.endswith('.pdf') else \
                   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        return send_file(
            filepath,
            as_attachment=True,
            mimetype=mimetype,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)