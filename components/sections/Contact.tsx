'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SocialLink {
  name: string
  url: string
  username: string
  description: string
}

const socialLinks: SocialLink[] = [
  {
    name: "GitHub",
    url: "https://github.com/hmziqrs",
    username: "@hmziqrs",
    description: "Open source contributions & projects"
  },
  {
    name: "LinkedIn",
    url: "https://linkedin.com/in/hmziqrs",
    username: "hmziqrs",
    description: "Professional network & experience"
  },
  {
    name: "Email",
    url: "mailto:hello@hmziq.rs",
    username: "hello@hmziq.rs",
    description: "Direct communication"
  }
]

const Contact: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.8,
        staggerChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: prefersReducedMotion ? 0 : 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: "easeOut",
      },
    },
  }

  const linkVariants = {
    hover: {
      scale: prefersReducedMotion ? 1 : 1.05,
      transition: { duration: 0.2 }
    }
  }

  return (
    <section id="contact" className="relative min-h-screen flex items-center justify-center px-6 py-20">
      <motion.div
        className="max-w-4xl mx-auto text-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2
          className="text-4xl md:text-6xl font-bold mb-12 text-gradient"
          variants={itemVariants}
        >
          Let&apos;s Connect
        </motion.h2>

        <motion.p
          className="text-xl md:text-2xl text-gray-400 mb-16 max-w-2xl mx-auto leading-relaxed"
          variants={itemVariants}
        >
          Always open to interesting conversations and collaboration opportunities.
        </motion.p>

        {/* Social Links */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          variants={itemVariants}
        >
          {socialLinks.map((link) => (
            <motion.a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-dark-200 border border-gray-800 rounded-lg p-6 transition-all duration-300 hover:border-gray-600 hover:bg-dark-100 group"
              variants={linkVariants}
              whileHover="hover"
            >
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gradient transition-all duration-300">
                  {link.name}
                </h3>
                <p className="text-gray-300 font-mono text-sm mb-2">
                  {link.username}
                </p>
                <p className="text-gray-500 text-sm">
                  {link.description}
                </p>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          className="border-t border-gray-800 pt-8"
          variants={itemVariants}
        >
          <p className="text-gray-600 text-sm">
            © 2025 hmziqrs. Crafted with passion and attention to detail.
          </p>
          
          {/* Scroll to top */}
          <motion.button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="mt-6 text-gray-500 hover:text-white transition-colors duration-300 text-sm tracking-widest"
            whileHover={{ scale: prefersReducedMotion ? 1 : 1.1 }}
          >
            ↑ BACK TO TOP
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Contact