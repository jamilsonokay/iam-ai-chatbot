"use client";

import { motion } from "framer-motion";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

type EmailFormProps = {
  onSubmit: (emailData: {
    to: string;
    cc: string;
    subject: string;
    body: string;
  }) => void;
  onCancel: () => void;
};

export const EmailForm = ({ onSubmit, onCancel }: EmailFormProps) => {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<{
    to?: string;
    subject?: string;
  }>({});

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: {to?: string; subject?: string} = {};
    
    // Validar campo "Para"
    if (!to) {
      newErrors.to = "O campo 'Para' é obrigatório";
    } else if (!validateEmail(to)) {
      newErrors.to = "Email inválido";
    }
    
    // Validar campo "Assunto"
    if (!subject) {
      newErrors.subject = "O campo 'Assunto' é obrigatório";
    }
    
    setErrors(newErrors);
    
    // Se não houver erros, enviar o formulário
    if (Object.keys(newErrors).length === 0) {
      onSubmit({ to, cc, subject, body });
    }
  };

  return (
    <motion.div
      className="border border-gray-200 rounded-md overflow-hidden shadow-md bg-white"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-blue-50 p-3 border-b border-blue-200">
        <h3 className="font-medium text-blue-800">Novo Email</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="space-y-4">
          <div>
            <div className="flex items-center">
              <label htmlFor="to" className="w-20 font-medium text-gray-700">Para:</label>
              <Input
                id="to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={`flex-1 ${errors.to ? 'border-red-300' : ''}`}
                placeholder="email@exemplo.com"
              />
            </div>
            {errors.to && <p className="text-red-500 text-sm mt-1 ml-20">{errors.to}</p>}
          </div>
          
          <div className="flex items-center">
            <label htmlFor="cc" className="w-20 font-medium text-gray-700">Cc:</label>
            <Input
              id="cc"
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="flex-1"
              placeholder="email@exemplo.com"
            />
          </div>
          
          <div>
            <div className="flex items-center">
              <label htmlFor="subject" className="w-20 font-medium text-gray-700">Assunto:</label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`flex-1 ${errors.subject ? 'border-red-300' : ''}`}
              />
            </div>
            {errors.subject && <p className="text-red-500 text-sm mt-1 ml-20">{errors.subject}</p>}
          </div>
          
          <div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full min-h-[150px] mt-2"
              placeholder="Escreva sua mensagem aqui..."
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Enviar
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};