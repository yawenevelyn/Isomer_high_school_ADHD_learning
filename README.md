# LLM-Driven Interactive Mind Map for ADHD Learners

[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Research Project**: Exploring LLM Agents as Interactive Mind Map Creators Tailored for Students with ADHD

## 📚 Abstract

Students with Attention Deficit Hyperactivity Disorder (ADHD) often struggle with traditional text-based learning materials due to executive function deficits that affect their ability to process, organise, and retain information. While the rapid development of Large Language Models (LLMs) has sparked innovation in generative user interfaces, existing products fail to address the specific learning challenges faced by students with ADHD.

This project introduces a novel prototype that leverages LLM agents as interactive mind-map creators specifically designed to support ADHD learners. Our solution automatically transforms dense text-based documents into interactive, ADHD-friendly interactive mind maps. These dynamic visual representations allow students to engage with learning tasks, explore content node by node, asking questions, and monitoring their learning progress.

**Preliminary testing suggests improvements in four key areas:**
- 🎯 Increased motivation to engage with learning materials
- 🧠 Enhanced concentration during study sessions  
- 📋 Better task planning and organisation skills
- 💡 Improved ability to extract and understand main ideas from complex texts

Paper link: [Exploring LLM Agents as Interactive Mind Map Creators Tailored for Students with ADHD](https://doi.org/10.1145/3746058.3759012)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn** package manager
- **OpenAI API Key** (for LLM functionality)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/llm-driven-interactive-mind-map.git
   cd llm-driven-interactive-mind-map
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### Basic Workflow

1. **Generate Mind Map**: Click "Generate Interactive Mind Map" to create a flowchart from sample learning material
2. **Explore Nodes**: Click on any node to view its details and explanations
3. **Track Progress**: Mark nodes as completed to visualize your learning journey
4. **Ask Questions**: Switch to chat mode to ask specific questions about concepts
5. **Review & Reflect**: Use the checking questions to validate your understanding

### Advanced Features

- **Custom Learning Materials**: Upload your own text documents for mind map generation
- **Learning Analytics**: Monitor completion rates and learning patterns
- **Export Options**: Save your mind maps for offline review

## 🏗️ Architecture

### Frontend
- **Next.js 15**: React framework with App Router
- **React Flow**: Interactive flowchart visualization
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development

### Backend
- **AI SDK**: OpenAI integration for LLM-powered content generation
- **Streaming API**: Real-time content delivery
- **Zod Schema**: Runtime type validation

### Key Components
- `FlowchartGenerator`: AI-powered mind map creation
- `InteractiveNodes`: Clickable learning elements
- `ProgressTracker`: Learning completion monitoring
- `ChatInterface`: AI-powered Q&A system

## 🔬 Research Context

This project contributes to the emerging field of **LLM-powered generative user interfaces** by demonstrating their potential as inclusive learning tools. By specifically addressing the needs of neurodivergent learners, we open up new avenues for exploration in:

- **Accessibility in AI**: Making AI tools usable for diverse cognitive profiles
- **Educational Technology**: Leveraging LLMs for personalized learning experiences
- **Human-Computer Interaction**: Designing interfaces that support executive function
- **Inclusive Design**: Creating tools that work for neurodivergent users

