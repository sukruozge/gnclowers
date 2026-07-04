import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface Step {
  n: number;
  t: string;
  b: string;
}

interface StorySectionProps {
  locale: 'tr' | 'en';
  eyebrow: string;
  title: string;
  steps: Step[];
  buttonText: string;
  buttonLink: string;
  imageUrl1: string;
  imageUrl2: string;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const cardsVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: 'easeOut',
    },
  },
};

export const StorySection = ({
  locale,
  eyebrow,
  title,
  steps,
  buttonText,
  buttonLink,
  imageUrl1,
  imageUrl2,
  className,
}: StorySectionProps) => {
  const gridBackgroundStyle = {
    backgroundImage:
      'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(to right, var(--line) 1px, transparent 1px)',
    backgroundSize: '2.5rem 2.5rem',
  };

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden bg-background py-16 md:py-24 border-y border-border/40',
        className
      )}
    >
      {/* Decorative Grid Background */}
      <div
        className="absolute inset-0 opacity-40"
        style={gridBackgroundStyle}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />

      <div className="relative container mx-auto px-6 max-w-[1240px]">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {/* Left: Text & Steps */}
          <div className="flex flex-col text-left">
            <motion.span
              className="text-primary text-xs font-semibold tracking-widest uppercase mb-3 block"
              variants={itemVariants}
            >
              {eyebrow}
            </motion.span>
            
            <motion.h2
              className="font-serif text-3xl md:text-4xl text-foreground font-normal leading-tight mb-8"
              variants={itemVariants}
            >
              {title}
            </motion.h2>

            <div className="flex flex-col gap-6 mb-8">
              {steps.map((step, idx) => (
                <motion.div
                  key={step.n}
                  className="flex gap-4 items-start group"
                  variants={itemVariants}
                >
                  <div className="flex-none flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-serif font-bold text-lg transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      {step.t}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.b}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div variants={itemVariants}>
              <a href={buttonLink}>
                <Button variant="outline" className="rounded-full px-6 py-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  {buttonText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Right: Overlapping Cards */}
          <motion.div
            className="relative w-full h-[320px] sm:h-[400px] md:h-[450px] lg:h-[480px] flex items-center justify-center mt-6 lg:mt-0"
            variants={cardsVariants}
          >
            {/* Back Card */}
            <motion.div
              className="absolute w-[200px] sm:w-[280px] md:w-[320px] aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.06)] border border-border/20 transform rotate-[-6deg] translate-x-12 sm:translate-x-16"
              whileHover={{ 
                y: -12, 
                rotate: -9, 
                scale: 1.02,
                transition: { duration: 0.3, ease: 'easeOut' } 
              }}
            >
              <img
                src={imageUrl2}
                alt={locale === 'tr' ? 'Aselovers El Emeği Amigurumi Oyuncak' : 'Aselovers Handcrafted Amigurumi Toy'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>

            {/* Front Card */}
            <motion.div
              className="absolute w-[200px] sm:w-[280px] md:w-[320px] aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-border/30 transform rotate([4deg]) -translate-x-12 sm:-translate-x-16"
              whileHover={{ 
                y: -12, 
                rotate: 7, 
                scale: 1.02,
                transition: { duration: 0.3, ease: 'easeOut' } 
              }}
            >
              <img
                src={imageUrl1}
                alt={locale === 'tr' ? 'Aselovers Örgü Çanta' : 'Aselovers Crochet Bag'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
