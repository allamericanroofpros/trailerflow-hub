import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
export default function Privacy() {
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
        <h1 className='text-3xl font-extrabold tracking-tight mb-2'>Privacy Policy</h1>
        <p className='text-sm text-muted-foreground mb-10'>Last updated: March 2026</p>
        <div className='space-y-8 text-foreground'>
          <section><h2 className='text-xl font-bold mb-3'>1. Information We Collect</h2><p className='text-muted-foreground leading-relaxed'>We collect information you provide (name, email, business name, phone), data from your use of the Service (orders, transactions, inventory, events), and technical data (IP, browser type, usage patterns).</p></section>
          <section><h2 className='text-xl font-bold mb-3'>2. How We Use Your Information</h2><p className='text-muted-foreground leading-relaxed'>We use your data to provide and improve the Service, process payments, send transactional emails, and provide support. We do not sell your personal data.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>3. Data Storage and Security</h2><p className='text-muted-foreground leading-relaxed'>Your data is stored using Supabase infrastructure with industry-standard encryption at rest and in transit. Access controls limit internal data access.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>4. Third-Party Services</h2><p className='text-muted-foreground leading-relaxed'>We use Stripe for payments and Supabase for database and authentication. We share only the minimum data necessary for these services to operate.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>5. Your Rights</h2><p className='text-muted-foreground leading-relaxed'>You may request access, correction, or deletion of your data at any time. Account deletion requests are processed within 30 days.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>6. Cookies</h2><p className='text-muted-foreground leading-relaxed'>We use essential cookies for authentication and session management only. We do not use advertising or tracking cookies.</p></section>
          <section><h2 className='text-xl font-bold mb-3'>7. Contact</h2><p className='text-muted-foreground leading-relaxed'>Privacy questions? Email <a href='mailto:support@getvendorflow.app' className='text-primary hover:underline'>support@getvendorflow.app</a></p></section>
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
