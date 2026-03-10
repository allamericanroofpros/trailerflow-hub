import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
export default function Terms() {
  return (
    <div className='min-h-screen bg-background text-foreground'>
      <header className='border-b border-border/60 bg-background/80 backdrop-blur-md'>
        <div className='mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6'>
          <Link to='/' className='flex items-center gap-2.5'>
            <BrandLogo size='sm' />
            
          </Link>
          <Link to='/signup' className='text-sm text-primary hover:underline'>Back to signup</Link>
        </div>
      </header>
      <main className='mx-auto max-w-4xl px-4 sm:px-6 py-16'>
        <h1 className='text-3xl font-extrabold tracking-tight mb-2'>Terms of Service</h1>
        <p className='text-sm text-muted-foreground mb-10'>Last updated: March 2026</p>
        <div className='space-y-8 text-foreground'>
          <section><h2 className='text-xl font-bold mb-3'>1. Acceptance of Terms</h2><p className='text-muted-foreground leading-relaxed'>By accessing or using VendorFlow you agree to be bound by these Terms. If you do not agree, do not use the Service.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>2. Description of Service</h2><p className='text-muted-foreground leading-relaxed'>VendorFlow provides business management software for mobile food vendors including POS, inventory, event management, team management, and related tools on a subscription basis.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>3. Subscription and Billing</h2><p className='text-muted-foreground leading-relaxed'>VendorFlow is a paid subscription service billed monthly or annually. Founders Plan pricing is locked for life for qualifying subscribers. All fees are non-refundable except where required by law. You may cancel at any time; access continues until end of billing period.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>4. User Accounts</h2><p className='text-muted-foreground leading-relaxed'>You are responsible for maintaining account security and all activity under your account. You may not share accounts or use the Service for unlawful purposes.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>5. Data and Privacy</h2><p className='text-muted-foreground leading-relaxed'>Your use is governed by our <Link to='/privacy' className='text-primary hover:underline'>Privacy Policy</Link>. You retain ownership of your business data. We do not sell your data to third parties.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>6. Acceptable Use</h2><p className='text-muted-foreground leading-relaxed'>You agree not to misuse the Service, attempt unauthorized access, reverse-engineer the platform, or violate applicable law. We reserve the right to suspend violating accounts.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>7. Limitation of Liability</h2><p className='text-muted-foreground leading-relaxed'>VendorFlow is provided as-is. We are not liable for indirect, incidental, or consequential damages. Total liability shall not exceed amounts paid in the prior 3 months.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>8. Contact</h2><p className='text-muted-foreground leading-relaxed'>Questions? Email <a href='mailto:support@getvendorflow.app' className='text-primary hover:underline'>support@getvendorflow.app</a></p></section>
        </div>
      </main>
      <footer className='border-t border-border/60 mt-16'>
        <div className='mx-auto max-w-4xl px-4 sm:px-6 py-8 flex items-center justify-between'>
          <p className='text-xs text-muted-foreground'>© {new Date().getFullYear()} VendorFlow.</p>
          <div className='flex gap-4 text-xs'><Link to='/terms' className='text-muted-foreground hover:text-foreground'>Terms</Link><Link to='/privacy' className='text-muted-foreground hover:text-foreground'>Privacy</Link></div>
        </div>
      </footer>
    </div>
  );
}
