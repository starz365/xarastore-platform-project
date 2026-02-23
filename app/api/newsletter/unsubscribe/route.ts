import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, reason, feedback } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find subscriber
    const { data: subscriber } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, status')
      .eq('email', email.toLowerCase())
      .single();

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Email not found in our newsletter list' },
        { status: 404 }
      );
    }

    if (subscriber.status === 'unsubscribed') {
      return NextResponse.json({
        success: true,
        message: 'Email already unsubscribed',
        already_unsubscribed: true,
      });
    }

    // Update subscriber status
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        unsubscribe_reason: reason,
        unsubscribe_feedback: feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    // Track unsubscribe event
    await supabase.from('analytics_events').insert({
      type: 'newsletter_unsubscribe',
      data: {
        email: subscriber.email,
        reason,
        feedback,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
      email: subscriber.email,
    });
  } catch (error: any) {
    console.error('Newsletter unsubscribe error:', error);
    
    return NextResponse.json(
      {
        error: 'Unsubscribe failed',
        message: 'Please try again or contact support',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      // Show unsubscribe form
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Unsubscribe from Xarastore Newsletter</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 20px;
                background-color: #f9f9f9;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(to right, #dc2626, #991b1b);
                padding: 30px;
                text-align: center;
                color: white;
              }
              .content {
                padding: 40px;
              }
              .form-group {
                margin-bottom: 20px;
              }
              label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
              }
              input, select, textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
              }
              textarea {
                min-height: 100px;
                resize: vertical;
              }
              .checkbox-group {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 20px 0;
              }
              button {
                background-color: #dc2626;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 5px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                transition: background-color 0.2s;
              }
              button:hover {
                background-color: #b91c1c;
              }
              .success {
                background-color: #d1fae5;
                color: #065f46;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
              }
              .error {
                background-color: #fee2e2;
                color: #991b1b;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Xarastore</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">it's a deal</p>
              </div>
              <div class="content">
                <h2 style="color: #dc2626; margin-top: 0;">Unsubscribe from Newsletter</h2>
                <form id="unsubscribeForm">
                  <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" required 
                           value="${email || ''}" ${email ? 'readonly' : ''}>
                  </div>
                  <div class="form-group">
                    <label for="reason">Reason for unsubscribing (optional)</label>
                    <select id="reason" name="reason">
                      <option value="">Select a reason</option>
                      <option value="too_many_emails">Receiving too many emails</option>
                      <option value="not_relevant">Content not relevant to me</option>
                      <option value="not_interested">Not interested anymore</option>
                      <option value="other">Other reason</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="feedback">Feedback (optional)</label>
                    <textarea id="feedback" name="feedback" 
                              placeholder="Tell us how we can improve..."></textarea>
                  </div>
                  <div class="checkbox-group">
                    <input type="checkbox" id="confirm" name="confirm" required>
                    <label for="confirm">I confirm I want to unsubscribe from Xarastore newsletters</label>
                  </div>
                  <button type="submit">Unsubscribe</button>
                </form>
                <div id="message"></div>
              </div>
            </div>
            <script>
              document.getElementById('unsubscribeForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const form = e.target;
                const button = form.querySelector('button');
                const messageDiv = document.getElementById('message');
                
                button.disabled = true;
                button.textContent = 'Processing...';
                messageDiv.innerHTML = '';
                
                try {
                  const formData = {
                    email: form.email.value,
                    reason: form.reason.value,
                    feedback: form.feedback.value,
                  };
                  
                  const response = await fetch('/api/newsletter/unsubscribe', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                  });
                  
                  const data = await response.json();
                  
                  if (response.ok) {
                    messageDiv.innerHTML = \`
                      <div class="success">
                        <h3>✓ Successfully Unsubscribed</h3>
                        <p>\${data.message}</p>
                        <p>You will no longer receive marketing emails from Xarastore.</p>
                      </div>
                    \`;
                    form.style.display = 'none';
                  } else {
                    messageDiv.innerHTML = \`
                      <div class="error">
                        <h3>⚠️ Error</h3>
                        <p>\${data.error || 'Something went wrong'}</p>
                      </div>
                    \`;
                  }
                } catch (error) {
                  messageDiv.innerHTML = \`
                    <div class="error">
                      <h3>⚠️ Network Error</h3>
                      <p>Please check your connection and try again.</p>
                    </div>
                  \`;
                } finally {
                  button.disabled = false;
                  button.textContent = 'Unsubscribe';
                }
              });
            </script>
          </body>
        </html>
      `;
      
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // Process token-based unsubscribe
    const { data: subscriber } = await supabase
      .from('newsletter_subscribers')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    // Update status
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    // Return success page
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Unsubscribed Successfully</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background-color: #f9f9f9;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .container {
              max-width: 500px;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              text-align: center;
            }
            .header {
              background: linear-gradient(to right, #dc2626, #991b1b);
              padding: 40px;
              color: white;
            }
            .content {
              padding: 40px;
            }
            .success-icon {
              font-size: 48px;
              color: #10b981;
              margin-bottom: 20px;
            }
            h1 {
              color: #dc2626;
              margin: 20px 0;
            }
            p {
              color: #666;
              margin-bottom: 30px;
            }
            .actions {
              display: flex;
              gap: 10px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .btn {
              padding: 12px 24px;
              border-radius: 5px;
              text-decoration: none;
              font-weight: 500;
              transition: all 0.2s;
            }
            .btn-primary {
              background-color: #dc2626;
              color: white;
            }
            .btn-primary:hover {
              background-color: #b91c1c;
            }
            .btn-secondary {
              background-color: #f3f4f6;
              color: #374151;
            }
            .btn-secondary:hover {
              background-color: #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">Xarastore</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">it's a deal</p>
            </div>
            <div class="content">
              <div class="success-icon">✓</div>
              <h1>Unsubscribed Successfully</h1>
              <p>You have been unsubscribed from Xarastore newsletters. You will no longer receive marketing emails.</p>
              <p style="font-size: 14px; color: #9ca3af;">
                Email: ${email}
              </p>
              <div class="actions">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="btn btn-primary">Return to Homepage</a>
                <a href="mailto:support@xarastore.com" class="btn btn-secondary">Contact Support</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(successHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error('Unsubscribe GET error:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background-color: #f9f9f9;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .container {
              max-width: 500px;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              text-align: center;
            }
            .header {
              background: linear-gradient(to right, #dc2626, #991b1b);
              padding: 40px;
              color: white;
            }
            .content {
              padding: 40px;
            }
            .error-icon {
              font-size: 48px;
              color: #ef4444;
              margin-bottom: 20px;
            }
            h1 {
              color: #dc2626;
              margin: 20px 0;
            }
            p {
              color: #666;
              margin-bottom: 30px;
            }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              background-color: #dc2626;
              color: white;
              border-radius: 5px;
              text-decoration: none;
              font-weight: 500;
              transition: background-color 0.2s;
            }
            .btn:hover {
              background-color: #b91c1c;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">Xarastore</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">it's a deal</p>
            </div>
            <div class="content">
              <div class="error-icon">⚠️</div>
              <h1>Something Went Wrong</h1>
              <p>We encountered an error while processing your unsubscribe request. Please try again or contact support.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="btn">Return to Homepage</a>
            </div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}
