import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FadeInOnScroll from '@/components/FadeInOnScroll';

export default function TermsPage() {
  return (
    <div className="min-h-screen page-transition">
      <Header />
      <main>
        <FadeInOnScroll delay={0} duration={800}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-sm text-gray-500 mb-10">
              Effective Date: 01/01/2026
            </p>
            <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
              <p>
                <strong>Company:</strong> EZ2INVOICE LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;)<br />
                <strong>Email:</strong>{' '}
                <a href="mailto:ez2invoicellc@gmail.com" className="text-primary-500 hover:underline">ez2invoicellc@gmail.com</a>
              </p>
              <p>
                <strong>Website / App:</strong>{' '}
                <a href="https://ez2invoice.us" className="text-primary-500 hover:underline" target="_blank" rel="noopener noreferrer">https://ez2invoice.us</a>{' '}
                (the &quot;Service&quot;)
              </p>
              <p>
                By accessing or using the Service, you agree to these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Service.
              </p>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">1) The Service</h2>
                <p>
                  EZ2Invoice is a software platform that helps businesses manage invoices, estimates, work orders, customers, inventory, labor, and related tools (&quot;Service&quot;). Features may change or be updated over time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">2) Eligibility and Accounts</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You must be at least 18 years old and able to form a binding contract.</li>
                  <li>You must provide accurate information and keep your account information current.</li>
                  <li>You are responsible for all activity that occurs under your account and for maintaining password security.</li>
                  <li>If you use the Service on behalf of a business, you confirm you have authority to bind that business to these Terms.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">3) Subscriptions, Billing, and Payments</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Some features require a paid subscription.</li>
                  <li>Subscription pricing and plan details are displayed on the Service and/or at checkout.</li>
                  <li>Payments are processed by a third-party payment processor (such as Stripe). We do not store complete payment card information.</li>
                  <li>You are responsible for any applicable taxes unless otherwise stated.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">4) Coupons, Promotions, and First Month Free</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We may offer promotions, including a coupon that makes the first month free for eligible new customers.</li>
                  <li>Promotions may be limited to one per customer/business unless we state otherwise.</li>
                  <li>Promotions may be changed or discontinued at any time, to the extent allowed by law.</li>
                  <li>If the promotion applies, you may be required to add a valid payment method to start the subscription, and billing will begin after the promotional period ends unless canceled before then.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">5) Auto-Renewal, Cancellation, and No Refund Policy</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Subscriptions auto-renew unless canceled before the next billing date.</li>
                  <li>You can cancel through your account settings (if available) or by contacting us at{' '}
                    <a href="mailto:ez2invoicellc@gmail.com" className="text-primary-500 hover:underline">ez2invoicellc@gmail.com</a>.
                  </li>
                  <li><strong>No refunds:</strong> To the maximum extent permitted by law, all fees are non-refundable, and we do not provide prorated refunds for partial billing periods.</li>
                  <li>If you cancel, your subscription will remain active until the end of the current paid billing period. You will not be charged again after cancellation unless you re-subscribe.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">6) Data Export Window After Cancellation</h2>
                <p>
                  We allow you to export/download your data until the end of your paid period. Example: If your billing date is the 11th of each month and you cancel on the 19th, you will still have access and can export your data until the 11th of the next month (the end of that billing cycle). After your paid period ends, access may end and your ability to export may no longer be available.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">7) Your Content and Data</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You may upload or create information in the Service (including customer details, VINs, invoices, work orders, notes, files, and other content) (&quot;Customer Data&quot;).</li>
                  <li>You retain ownership of your Customer Data.</li>
                  <li>You grant us a limited license to host, store, process, transmit, and display Customer Data only as needed to operate and provide the Service.</li>
                  <li>You are responsible for ensuring you have the rights and permissions to store and process Customer Data, including any personal information of your customers.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">8) Acceptable Use</h2>
                <p className="mb-2">You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service for illegal purposes or to violate laws/regulations.</li>
                  <li>Upload malware or harmful code, or attempt to disrupt the Service.</li>
                  <li>Attempt to access other accounts or data without permission.</li>
                  <li>Reverse engineer, copy, resell, or exploit the Service except as allowed by law or with written permission.</li>
                  <li>Use the Service to transmit spam or unsolicited communications.</li>
                </ul>
                <p className="mt-3">We may suspend or terminate accounts that violate these Terms.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">9) Third-Party Services</h2>
                <p>
                  The Service may use or integrate with third-party services (for example: payment processing, analytics, hosting, email delivery). Your use of third-party services may be subject to their terms and policies. We are not responsible for third-party services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">10) Intellectual Property</h2>
                <p>
                  The Service (including software, design, branding, and content provided by the Company) is owned by EZ2INVOICE LLC and protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable license to use the Service during your active subscription, subject to these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">11) Feedback</h2>
                <p>
                  If you send suggestions or feedback, you allow us to use it without compensation or obligation to you.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">12) Availability and Changes</h2>
                <p>
                  We strive for reliable service but do not guarantee uninterrupted availability. We may modify, suspend, or discontinue parts of the Service at any time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">13) Disclaimers</h2>
                <p className="uppercase text-sm font-medium mb-2">THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
                <p>
                  The Service is a business tool and does not provide legal, tax, accounting, or compliance advice. You are responsible for your business decisions and compliance requirements.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">14) Limitation of Liability</h2>
                <p className="uppercase text-sm font-medium mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOST PROFITS OR LOST DATA).</li>
                  <li>OUR TOTAL LIABILITY FOR ANY CLAIM RELATED TO THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID TO US FOR THE SERVICE IN THE THREE (3) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.</li>
                </ul>
                <p className="mt-3">Some jurisdictions do not allow certain limitations, so some of these limitations may not apply.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">15) Indemnification</h2>
                <p>
                  You agree to defend, indemnify, and hold harmless EZ2INVOICE LLC and its owners, employees, contractors, and affiliates from claims, damages, liabilities, and expenses (including attorneys&apos; fees) arising from your use of the Service, your Customer Data, or your violation of these Terms or applicable law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">16) Termination</h2>
                <p>
                  We may suspend or terminate your access if you violate these Terms, fail to pay amounts due, or if required to protect the Service or comply with law. Upon termination, your right to use the Service ends.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">17) Governing Law and Venue</h2>
                <p>
                  These Terms are governed by the laws of the Commonwealth of Kentucky, without regard to conflict of law rules. Any dispute will be brought in the state or federal courts located in Jefferson County, Kentucky, unless applicable law requires otherwise.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">18) Changes to These Terms</h2>
                <p>
                  We may update these Terms from time to time. If changes are material, we will post updated Terms on the website and update the Effective Date. Continued use after the effective date means you accept the updated Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">19) Contact</h2>
                <p>
                  Questions about these Terms?
                </p>
                <p className="mt-2">
                  EZ2INVOICE LLC<br />
                  <a href="mailto:ez2invoicellc@gmail.com" className="text-primary-500 hover:underline">ez2invoicellc@gmail.com</a>
                </p>
              </section>
            </div>
          </div>
        </FadeInOnScroll>
      </main>
      <Footer />
    </div>
  );
}
