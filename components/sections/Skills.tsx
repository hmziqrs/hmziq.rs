'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SkillCategory {
  title: string
  skills: string[]
  description: string
}

const skillCategories: SkillCategory[] = [
  {
    title: "Frontend",
    description: "Crafting intuitive user experiences",
    skills: ["TypeScript", "React.js", "Next.js", "React Native"]
  },
  {
    title: "Backend", 
    description: "Building robust server architectures",
    skills: ["AdonisJS", "Express.js", "Rust (Axum)", "Node.js"]
  },
  {
    title: "Cross-Platform",
    description: "Delivering seamless multi-platform solutions", 
    skills: ["Flutter", "Dioxus", "Electron", "Tauri"]
  }
]

const Skills: React.FC = () => {
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

  const cardVariants = {
    hidden: { y: prefersReducedMotion ? 0 : 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: "easeOut",
      },
    },
  }

  const skillVariants = {
    hidden: { scale: prefersReducedMotion ? 1 : 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.4,
        ease: "easeOut",
      },
    },
  }

  return (
    <section id="skills" className="relative min-h-screen flex items-center justify-center px-6 py-20">
      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2
          className="text-4xl md:text-6xl font-bold text-center mb-16 text-gradient"
          variants={cardVariants}
        >
          Expertise
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {skillCategories.map((category) => (
            <motion.div
              key={category.title}
              className="relative group"
              variants={cardVariants}
            >
              <div className="bg-dark-200 border border-gray-800 rounded-lg p-8 h-full transition-all duration-300 hover:border-gray-600 hover:bg-dark-100">
                {/* Category Header */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {category.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {category.description}
                  </p>
                </div>

                {/* Skills Grid */}
                <div className="space-y-3">
                  {category.skills.map((skill, skillIndex) => (
                    <motion.div
                      key={skill}
                      className="flex items-center justify-center"
                      variants={skillVariants}
                      custom={skillIndex}
                    >
                      <div className="bg-gray-800 text-gray-300 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors duration-200 w-full text-center">
                        {skill}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-transparent to-star-blue opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          className="text-center mt-16"
          variants={cardVariants}
        >
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Continuously learning and adapting to new technologies. 
            My focus is on delivering high-quality solutions that make a real impact.
          </p>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Skills