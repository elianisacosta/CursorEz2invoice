import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FadeInOnScroll from '@/components/FadeInOnScroll';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen page-transition">
      <Header />
      <main>
        <FadeInOnScroll delay={0} duration={800}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-10">
              Effective Date: 01/01/2026
            </p>
            <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
              <p>
                <strong>Company:</strong> EZ2INVOICE LLC (&quot;EZ2Invoice,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;)<br />
                <strong>Email:</strong>{' '}
                <a href="mailto:ez2invoicellc@gmail.com" className="text-primary-500 hover:underline">ez2invoicellc@gmail.com</a>
              </p>
              <p>
                <strong>Website / App:</strong>{' '}
                <a href="https://ez2invoice.us" className="text-primary-500 hover:underline" target="_blank" rel="noopener noreferrer">https://ez2invoice.us</a>{' '}
                (the &quot;Service&quot;)
              </p>
              <p>
                This Privacy Policy explains how we collect, use, share, and protect information when you use our Service.
              </p>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">1) Information We Collect</h2>
                <h3 className="text-lg font-medium text-gray-800 mt-6 mb-2">A) Information You Provide to Us</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account information:</strong> name, email, password (stored securely), company/shop name, phone (if provided).</li>
                  <li><strong>Billing information:</strong> subscription status and billing history. Payment card details are processed by our payment processor (e.g., Stripe) and are not stored by us.</li>
                  <li><strong>Support communications:</strong> messages you send us (email, chat, bug reports), and any attachments you provide.</li>
                  <li><strong>Customer Data you upload or create:</strong> information you enter into the app such as customers, invoices, estimates, work orders, vehicle details (including VIN), inventory, labor entries, notes, and files.</li>
                </ul>
                <h3 className="text-lg font-medium text-gray-800 mt-6 mb-2">B) Information Collected Automatically</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Device and usage data:</strong> pages/screens viewed, actions taken, timestamps, approximate location (based on IP), browser type, device type, and general diagnostics.</li>
                  <li><strong>Cookies &amp; similar technologies:</strong> used for login/session functionality, security, and improving the Service.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">2) How We Use Information</h2>
                <p className="mb-2">We use information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and operate the Service (accounts, logins, features, data storage).</li>
                  <li>Process subscriptions and manage billing (through our payment processor).</li>
                  <li>Communicate with you (service notices, account messages, support replies).</li>
                  <li>Secure the Service (fraud prevention, abuse detection, troubleshooting).</li>
                  <li>Improve and develop features, performance, and user experience.</li>
                  <li>Comply with legal obligations and enforce our Terms.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">3) How We Share Information</h2>
                <p className="mb-3">We do not sell your personal information.</p>
                <p className="mb-2">We may share information with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Service providers</strong> that help us run the Service (for example: hosting, database services, email delivery, analytics, customer support tools, and payment processors like Stripe). They are allowed to use information only to provide services to us.</li>
                  <li><strong>Legal and safety reasons:</strong> if required by law, court order, subpoena, or to protect rights, safety, and prevent fraud/abuse.</li>
                  <li><strong>Business transfers:</strong> if we are involved in a merger, acquisition, financing, or sale of assets, information may be transferred as part of that transaction.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">4) Payment Processing</h2>
                <p>
                  Subscriptions are processed by third-party payment processors (such as Stripe). They may collect payment and transaction data directly. Your payment processor&apos;s privacy policy governs their handling of your payment information.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">5) Customer Data and Your Responsibilities</h2>
                <p>
                  The Service allows you to store information about your customers and business activity (&quot;Customer Data&quot;). You are responsible for ensuring you have the right to collect, use, and store that data in the Service, including any personal information.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">6) Data Retention</h2>
                <p className="mb-3">
                  We keep personal information and Customer Data for as long as needed to provide the Service and for legitimate business purposes (like compliance, dispute resolution, and enforcing agreements).
                </p>
                <p>
                  If you cancel your subscription: your access remains active until the end of your current paid period, and you may export/download your data during that time. After your paid period ends, your access may stop and we may delete or de-identify stored data according to our retention practices, unless we are required to keep it longer for legal reasons.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">7) Security</h2>
                <p>
                  We use reasonable administrative, technical, and organizational measures to protect information. However, no system can be 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">8) Your Choices and Rights</h2>
                <p className="mb-2">Depending on where you live, you may have rights to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access, correct, or update your account information.</li>
                  <li>Request deletion of your account and personal information (subject to legal/contractual limits).</li>
                  <li>Export your data while your subscription is active (including after cancellation until the end of the paid period).</li>
                </ul>
                <p className="mt-3">
                  To make a request, email{' '}
                  <a href="mailto:ez2invoicellc@gmail.com" className="text-primary-500 hover:underline">ez2invoicellc@gmail.com</a>.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">9) Cookies</h2>
                <p className="mb-2">We use cookies and similar technologies to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Keep you signed in and maintain sessions</li>
                  <li>Protect the Service and prevent fraud</li>
                  <li>Remember preferences</li>
                  <li>Understand how the Service is used (optional analytics)</li>
                </ul>
                <p className="mt-3">
                  You can control cookies through your browser settings. If you disable cookies, some parts of the Service may not work properly.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">10) Children&apos;s Privacy</h2>
                <p>
                  The Service is not intended for children under 13, and we do not knowingly collect personal information from children under 13.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">11) International Users</h2>
                <p>
                  If you access the Service from outside the United States, your information may be processed and stored in the United States (or other locations where our service providers operate).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">12) Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will post the updated version and change the Effective Date. Continued use of the Service after updates means you accept the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3">13) Contact Us</h2>
                <p>
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
