import { useCompletion, experimental_useObject as useObject } from '@ai-sdk/react';
import clsx from 'clsx';
import { MemoizedMarkdown } from './memoized-markdown';
import { useEffect, useState } from 'react';
import { z } from 'zod';

const checkingQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswerIndex: z.number(),
  explanation: z.string(),
});

interface CheckingQuestionProps {
  nodeName: string;
  nodeDetails: string;
}

export const CheckingQuestion = ({ nodeName, nodeDetails }: CheckingQuestionProps) => {
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(-1);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const { object: checkingQuestionObject, submit: generateCheckingQuestion } = useObject({
    api: '/api/flowchart/checking-question',
    schema: checkingQuestionSchema,
  });

  const { completion, setInput, handleSubmit } = useCompletion({
    api: '/api/challenges/explanation',
    streamProtocol: 'text',
  });

  useEffect(() => {
    if (selectedChoiceIndex > -1 && checkingQuestionObject?.options?.[selectedChoiceIndex] && checkingQuestionObject.correctAnswerIndex !== undefined) {
      setInput(`
        The question: ${checkingQuestionObject.question}, 
        options: {${checkingQuestionObject.options.map((option, index) => `Option ${index + 1}: ${option}`).join(', ')}}. 
        The selected option is: ${checkingQuestionObject.options[selectedChoiceIndex]}. 
        The correct answer is: ${checkingQuestionObject.options[checkingQuestionObject.correctAnswerIndex]}.`);
    } else {
      setInput('');
    }
  }, [selectedChoiceIndex, checkingQuestionObject, setInput]);

  const onGenerateCheckingQuestion = async () => {
    generateCheckingQuestion({ nodeName, nodeDetails });
    setSelectedChoiceIndex(-1);
    setIsAnswerCorrect(false);
    setShowExplanation(false);
  };

  const submitAnswer = () => {
    const correct = selectedChoiceIndex === checkingQuestionObject?.correctAnswerIndex;
    setIsAnswerCorrect(correct);
    setShowExplanation(true);
    handleSubmit();
  };

  if (!checkingQuestionObject) {
    return (
      <button
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer mb-4"
        onClick={onGenerateCheckingQuestion}
      >
        Generate Checking Question
      </button>
    );
  }

  return (
    <>
      <button
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer mb-4"
        onClick={onGenerateCheckingQuestion}
      >
        Generate Checking Question
      </button>
      
      <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-2xl flex flex-col gap-y-2 shadow border border-blue-200">
        <div className='p-4 text-xl font-bold'>{checkingQuestionObject.question}</div>
        
        <div className="flex flex-col gap-y-3">
          {checkingQuestionObject.options?.map((option, index) => (
            <div 
              onClick={() => setSelectedChoiceIndex(index)} 
              key={index} 
              className={clsx(
                'p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg border-2 backdrop-blur-sm',
                selectedChoiceIndex === index 
                  ? 'border-blue-600 bg-blue-100/90 shadow-lg scale-[1.02]' 
                  : 'border-blue-200/50 bg-white/90 hover:border-blue-400 hover:bg-blue-50/80'
              )}
            >
              <MemoizedMarkdown id={`checking-option-${index}`} content={option || ''} />
            </div>
          ))}
          
          <button
            className="mt-4 w-fit font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 cursor-pointer disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
            onClick={submitAnswer}
            disabled={selectedChoiceIndex === -1}
          >
            Submit Answer
          </button>
        </div>
        
        {showExplanation && (
          <div className={clsx('mt-4 p-6 rounded-xl shadow-lg backdrop-blur-sm', isAnswerCorrect ? 'bg-green-50/90 border-2 border-green-200' : 'bg-red-50/90 border-2 border-red-200')}>
            <h4 className={`font-semibold mb-3 text-lg ${isAnswerCorrect ? 'text-green-800' : 'text-red-800'}`}>
              {isAnswerCorrect ? '✅ Correct!' : '❌ Incorrect'}
            </h4>
            <MemoizedMarkdown id='checking-explanation' content={checkingQuestionObject.explanation || ''} />
            {completion && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <MemoizedMarkdown id='checking-feedback' content={completion || ''} />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

CheckingQuestion.displayName = 'CheckingQuestion';


