import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Target, Trophy, Users, Activity, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: { duration: 0.4, ease: "easeInOut" }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const features = [
    { icon: Target, title: 'Structured Path', desc: 'Follow the proven Striver A2Z sheet without getting lost in endless problem lists.' },
    { icon: Activity, title: 'Deep Analytics', desc: 'Understand your weak topics and track your problem-solving velocity over time.' },
    { icon: Users, title: 'Multiplayer Rooms', desc: 'Create private rooms, invite friends, and solve the same problems in real-time.' },
    { icon: Trophy, title: 'Global Leaderboard', desc: 'Stay motivated by competing with peers globally based on your consistency.' },
  ];

  return (
    <motion.div 
      className="min-h-screen bg-bg-base text-text-base flex flex-col items-center justify-center overflow-x-hidden relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Background decoration - Premium subtle glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center w-full py-20">
        
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-card-border text-primary font-semibold mb-8 text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Welcome to the Ultimate Preparation Hub</span>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6 flex items-center justify-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white shadow-xl text-2xl">
            D
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            DSA Arena
          </h1>
        </motion.div>

        <motion.h2 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Master Coding Interviews <br className="hidden md:block"/>
          <span className="text-text-muted">With Precision.</span>
        </motion.h2>

        <motion.p variants={itemVariants} className="mt-4 text-xl text-text-muted max-w-3xl mb-12 leading-relaxed">
          Don't just solve problems blindly. DSA Arena brings structure to your chaos by tracking your progress, analyzing your performance, and letting you compete with friends on your journey to top tech companies.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 mb-24">
          <button 
            onClick={handleGetStarted}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold text-white transition-all duration-300 btn-primary rounded-xl shadow-lg hover:shadow-primary/30 cursor-pointer"
          >
            Enter the Arena
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Why you should use DSA Arena</h3>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full"></div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
          {features.map((feat, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -8, scale: 1.02 }}
              className="glass p-8 rounded-2xl text-left flex flex-col items-start transition-all duration-300 hover:shadow-xl hover:border-primary/30"
            >
              <div className="p-4 bg-primary/10 rounded-xl mb-6 text-primary border border-primary/20">
                <feat.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
              <p className="text-text-muted text-base leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </motion.div>
  );
}
