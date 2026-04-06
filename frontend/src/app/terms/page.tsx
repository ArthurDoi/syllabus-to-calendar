import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Effective Date: {new Date().toLocaleDateString('en-US')}</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using <strong>Syllabus to Calendar</strong> (the "Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these Terms of Service, do not use our application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              Syllabus to Calendar is an automated scheduling tool designed to extract coursework, lectures, and assignments from academic syllabuses using Artificial Intelligence and synchronize them seamlessly with your Google Calendar.
            </p>
            <div className="mt-3 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <p className="font-semibold text-yellow-800 m-0 text-sm">Beta & Accuracy Disclaimer</p>
              <p className="text-yellow-800 text-[13.5px] mt-1 leading-snug">
                While we strive for high accuracy using advanced generative AI, the Service is provided "as is". AI extraction may occasionally omit or misinterpret dates. You are strongly advised to manually review the generated events prior to verifying and syncing them to your calendar. We hold no liability for missed academic deadlines resulting from parsing inconsistencies.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Google Account Integration</h2>
            <p>
              Our Service relies on Google OAuth integrations. By authorizing Syllabus to Calendar to connect with your Google Account, you grant our application the right and scope to manage calendar events specifically related to the courses you track. 
            </p>
            <p className="mt-2">
              We operate strictly within the terms defined in our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> and the Google API Services User Data Policy. We do not assume ownership of your calendar data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Intellectual Property</h2>
            <p>
              The Service Software and its original content, features, and functionality are and will remain the exclusive property of Syllabus to Calendar and its licensors. You retain full intellectual property rights and ownership over any documents, PDFs, or materials you upload. We do not claim ownership of your academic materials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. User Conduct and Restrictions</h2>
            <p>
              You agree not to use the Service:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>In any way that violates any applicable national or international law or academic institution policy.</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter" or "spam".</li>
              <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which may harm the Service or users of the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Limitation of Liability</h2>
            <p>
              In no event shall Syllabus to Calendar, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; and (iii) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact Information</h2>
            <p>
              For any legal inquiries, support requests, or questions regarding these Terms of Service, please reach out to the project administrator at:
            </p>
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 inline-block shadow-sm">
              <p className="font-medium text-gray-900 mb-1">Legal & Project Support</p>
              <a href="mailto:nammount19@gmail.com" className="text-blue-600 hover:text-blue-700 font-medium">nammount19@gmail.com</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
