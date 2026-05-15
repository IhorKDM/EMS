import { Link } from 'react-router-dom'
import { Users, Calendar, DollarSign, Umbrella, ScrollText, Shield, ArrowRight, Mail, Phone, MapPin } from 'lucide-react'

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <img src="/logo-light.png" alt="EMS" className="logo h-12 w-auto object-contain" />
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
          <a href="#about" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">About</a>
          <a href="#contact" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Contact</a>
        </div>
        <Link to="/login" className="btn-primary text-sm">
          Sign In <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Shield className="w-3.5 h-3.5" /> Secure Employee Management
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Manage your workforce<br />
          <span className="text-primary-600">with confidence</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
          A complete employee management system for modern businesses. Handle payroll, scheduling, holidays, and more — all in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/login" className="btn-primary px-6 py-3 text-base">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#features" className="btn-secondary px-6 py-3 text-base">
            Learn More
          </a>
        </div>
      </div>

      
    </section>
  )
}

const FEATURES = [
  { icon: Users,      title: 'User Management',    description: 'Manage employees and managers with role-based access control and granular permissions.' },
  { icon: Calendar,   title: 'Shift Scheduling',    description: 'Create and manage work schedules with a visual calendar. Employees see their own shifts in real time.' },
  { icon: DollarSign, title: 'Payroll',             description: 'Generate payslips automatically based on shifts worked. Supports hourly, daily, and contract pay types.' },
  { icon: Umbrella,   title: 'Holiday Management',  description: 'Employees submit holiday requests. Managers approve or reject with notes — all tracked in one place.' },
  { icon: ScrollText, title: 'Audit Logs',          description: 'Every action is logged. Know who did what and when across your entire organisation.' },
  { icon: Shield,     title: 'Role Based Access',   description: 'Admin, manager, and employee roles with 10 configurable permission flags per position.' },
]

function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Built for businesses of all sizes — from small teams to large organisations with multiple locations.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="card p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section id="about" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Built for real businesses</h2>
          <p className="text-slate-500 leading-relaxed mb-6">
            EMS was designed from the ground up to handle the complexity of modern workforce management. Whether you run a single office or multiple locations, EMS scales with you.
          </p>
          <p className="text-slate-500 leading-relaxed mb-10">
            Our permission system gives you full control — assign managers exactly the access they need, nothing more. Every action is audited so you always know what's happening in your organisation.
          </p>
          <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto">
            {[['10+', 'Permission flags'], ['Multi', 'Business support'], ['Real-time', 'Scheduling']].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold text-primary-600">{val}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Contact() {
  return (
    <section id="contact" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Get in touch</h2>
          <p className="text-slate-500">Have questions? We'd love to hear from you.</p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-10">
          {[
            { icon: Mail,   label: 'Email',   value: 'admin@ems.com' },
            { icon: Phone,  label: 'Phone',   value: '+441111111111' },
            { icon: MapPin, label: 'Address', value: '1 Business St, London, BE1 1EB' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-sm text-slate-700">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-6 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <img src="/logo-light.png" alt="EMS" className="logo-white h-10 w-auto object-contain" />
        <p className="text-xs">© {new Date().getFullYear()} Employee Management System. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#features" className="text-xs hover:text-white transition-colors">Features</a>
          <a href="#about" className="text-xs hover:text-white transition-colors">About</a>
          <a href="#contact" className="text-xs hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Hero />
      <Features />
      <About />
      <Contact />
      <Footer />
    </div>
  )
}