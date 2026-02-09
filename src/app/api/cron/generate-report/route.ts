import { NextRequest, NextResponse } from 'next/server';
import { getQualifiedLeadsForReport, weeklyReports } from '@/lib/airtable';
import { formatReportSection } from '@/lib/gemini';
import { Resend } from 'resend';

// Use Node.js runtime for Airtable SDK compatibility
export const maxDuration = 60;


const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Report Generation Cron Job
 * Runs every Monday at 08:30 CET
 * 
 * Generates and sends the weekly lead intelligence report
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Fetch qualified leads for this week
    console.log('Fetching qualified leads...');
    const leads = await getQualifiedLeadsForReport(today);

    if (leads.length === 0) {
      console.log('No qualified leads for this week');

      // Still send a notification email
      await resend.emails.send({
        from: 'Interim Lead Agent <onboarding@resend.dev>',
        to: process.env.REPORT_RECIPIENT_EMAIL!,
        subject: `Interim Lead Intelligence – ${today} (Ingen leads)`,
        html: `
          <h2>Ukentlig Lead Rapport</h2>
          <p>Ingen kvalifiserte leads denne uken.</p>
          <p>Systemet fortsetter å overvåke kilder.</p>
        `,
      });

      return NextResponse.json({
        success: true,
        leads_count: 0,
        message: 'No leads this week, notification sent',
      });
    }

    // Format leads for the report
    const formattedLeads = leads.map((lead) => {
      const cleanName = lead.company_name.replace(/\s+(ASA|AS|P\/F|N\.V\.|PLC)$|(\s+nyheter)$/i, '').trim();
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanName)}&tbm=nws`;

      return {
        company_name: lead.company_name,
        stars: lead.stars || 0,
        why_now_text: lead.why_now_text || 'Ikke tilgjengelig',
        suggested_role: lead.suggested_role || 'CEO/CFO',
        search_url: searchUrl,
        sources: [],
      };
    });

    // Generate report text using Gemini
    console.log('Generating report with Gemini...');
    const reportBody = await formatReportSection(formattedLeads);

    // Build HTML email
    const emailHtml = generateEmailHTML(today, leads.length, reportBody, formattedLeads);

    // Send email via Resend
    console.log('Sending email...');
    const emailResult = await resend.emails.send({
      from: 'Interim Lead Agent <onboarding@resend.dev>',
      to: process.env.REPORT_RECIPIENT_EMAIL!,
      subject: `Interim Lead Intelligence – ${today} (${leads.length} leads)`,
      html: emailHtml,
    });

    // Record in Airtable
    await weeklyReports.create([
      {
        fields: {
          report_date: today,
          leads_count: leads.length,
          leads: leads.map((l) => l.id).filter(Boolean),
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          recipient: process.env.REPORT_RECIPIENT_EMAIL,
          report_html: emailHtml.slice(0, 10000), // Truncate if needed
        } as any,
      },
    ]);

    console.log('Report sent successfully');

    return NextResponse.json({
      success: true,
      leads_count: leads.length,
      email_id: emailResult.data?.id,
      message: `Report sent with ${leads.length} leads`,
    });

  } catch (error) {
    console.error('Report generation failed:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

function generateEmailHTML(
  date: string,
  leadsCount: number,
  reportBody: string,
  leads: { company_name: string; stars: number; why_now_text: string; suggested_role: string; search_url: string }[]
): string {
  // Addendum §3: 1-3 star scale
  const starsToEmoji = (n: number) => '⭐'.repeat(Math.min(n, 3));

  const leadsHTML = leads
    .map(
      (lead, i) => `
      <div style="margin-bottom: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${lead.stars >= 3 ? '#28a745' : lead.stars >= 2 ? '#ffc107' : '#6c757d'
        };">
        <h3 style="margin: 0 0 8px 0; color: #212529;">
          ${i + 1}. ${lead.company_name} ${starsToEmoji(lead.stars)}
        </h3>
        <p style="margin: 0 0 8px 0; color: #495057;">
          <strong>Why now:</strong> ${lead.why_now_text}
        </p>
        <div style="margin-top: 12px; display: flex; gap: 12px;">
          <a href="${lead.search_url}" style="color: #007bff; text-decoration: none; font-size: 14px; font-weight: 600;">Søk i Google News</a>
          <span style="color: #6c757d; font-size: 14px;">•</span>
          <span style="color: #6c757d; font-size: 14px;">Anbefalt rolle: ${lead.suggested_role}</span>
        </div>
      </div>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #212529;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0; color: #1a1a2e;">📊 Interim Lead Intelligence</h1>
        <p style="margin: 8px 0 0 0; color: #6c757d;">Ukentlig rapport – ${date}</p>
      </div>

      <div style="background: #e7f3ff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 18px;">
          <strong>${leadsCount}</strong> kvalifiserte leads denne uken
        </p>
      </div>

      <h2 style="border-bottom: 2px solid #dee2e6; padding-bottom: 8px;">Leads</h2>
      
      ${leadsHTML}

      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 32px 0;">

      <p style="color: #6c757d; font-size: 12px; text-align: center;">
        Generert av Interim Lead Agent<br>
        Kilder: Brønnøysund, DN, NewsWeb, Mynewsdesk
      </p>
    </body>
    </html>
  `;
}
