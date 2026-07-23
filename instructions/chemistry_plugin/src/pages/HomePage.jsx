import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, GitMerge, Zap, ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const topics = [
  {
    id: 'equations',
    title: 'Chemical Equations',
    description: 'Learn how to write and balance chemical equations through interactive molecule-based visualization.',
    icon: <FlaskConical className="w-8 h-8 text-blue-500" />,
    color: 'blue',
    path: '/equations'
  },
  {
    id: 'reactions',
    title: 'Types of Chemical Reactions',
    description: 'Understand combination, decomposition, displacement, and precipitation reactions using dynamic simulations.',
    icon: <GitMerge className="w-8 h-8 text-indigo-500" />,
    color: 'indigo',
    path: '/reactions'
  },
  {
    id: 'redox',
    title: 'Oxidation & Reduction',
    description: 'Explore oxidation, reduction, redox reactions, and real-life effects like corrosion and rancidity.',
    icon: <Zap className="w-8 h-8 text-orange-500" />,
    color: 'orange',
    path: '/redox'
  }
];

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16 relative">
        <div className="bg-blob w-64 h-64 bg-primary -top-10 left-1/4" />
        <div className="bg-blob w-64 h-64 bg-secondary-purple -bottom-10 right-1/4" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6"
        >
          <Star className="w-4 h-4 fill-primary" />
          Welcome to Chemistry Quest
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl font-black text-slate-900 mb-6 tracking-tight"
        >
          Your Chemistry <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary-indigo">Adventure</span> Begins
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-600 max-w-2xl mx-auto"
        >
          Master the fundamentals of chemistry through interactive molecular visualizations and step-by-step reaction simulations.
        </motion.p>
      </div>

      {/* Topic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {topics.map((topic, index) => (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8 }}
            className="card p-8 flex flex-col h-full group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`w-16 h-16 rounded-2xl bg-${topic.color}-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                {topic.icon}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-3">{topic.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-8 flex-grow">
              {topic.description}
            </p>
            
            <button
              onClick={() => navigate(topic.path)}
              className={`w-full btn-primary !bg-${topic.color}-600 hover:!bg-${topic.color}-700 shadow-lg shadow-${topic.color}-600/20 group`}
            >
              Start Learning
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
