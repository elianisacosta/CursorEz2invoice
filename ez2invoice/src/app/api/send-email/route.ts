import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, type, estimateId, invoiceId } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Option 1: Use Supabase Edge Function (if configured)
    // Option 2: Use a third-party email service like Resend, SendGrid, etc.
    // Option 3: Use Supabase's built-in email (if available)
    
    // For now, we'll use a simple approach with Supabase's email functionality
    // or you can integrate with Resend, SendGrid, etc.
    
    // Using Supabase's email via Edge Function or direct integration
    // This is a placeholder - you'll need to configure your email service
    
    // If using Resend (recommended):
    // const RESEND_API_KEY = process.env.RESEND_API_KEY;
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${RESEND_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     from: 'noreply@ez2invoice.com',
    //     to: to,
    //     subject: subject,
    //     html: html,
    //   }),
    // });

    // For now, we'll use a simple email sending approach
    // You can replace this with your preferred email service
    
    // Using Supabase's email functionality via database trigger or edge function
    // Or use a service like Resend, SendGrid, Mailgun, etc.
    
    // Use Resend for email sending (recommended)
    // Get your API key from https://resend.com/api-keys
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    
    if (!RESEND_API_KEY) {
      // Fallback: Log the email (for development)
      console.log('Email would be sent:', {
        to,
        subject,
        html: html.substring(0, 100) + '...',
        type,
        estimateId,
        invoiceId
      });
      
      // In production, you should configure Resend API key
      // Add RESEND_API_KEY to your .env.local file
      return NextResponse.json(
        { 
          success: true, 
          message: 'Email service not configured. Email logged to console.',
          warning: 'Please add RESEND_API_KEY to your environment variables. Get your key from https://resend.com/api-keys'
        },
        { status: 200 }
      );
    }

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: to,
        subject: subject,
        html: html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Email service error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    const emailData = await emailResponse.json();

    // Log email sent in database (optional)
    if (estimateId) {
      // You can create a table to track sent emails
      await supabase.from('estimates').update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      }).eq('id', estimateId);
    }

    if (invoiceId) {
      await supabase.from('invoices').update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      }).eq('id', invoiceId);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      data: emailData 
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}

