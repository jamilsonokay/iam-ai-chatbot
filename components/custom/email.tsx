"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { EmailForm } from "./email-form";

type EmailProps = {
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  status?: string;
  error?: string;
};

export const Email = ({ to, cc, subject, body, status, error }: EmailProps) => {
  // Sempre mostrar o formulário inicialmente, independente dos dados recebidos
  const [showForm, setShowForm] = useState(true);
  const [emailData, setEmailData] = useState({
    to: to || "",
    cc: cc || "",
    subject: subject || "",
    body: body || ""
  });
  
  if (error) {
    return (
      <div className="border border-red-200 rounded-md p-4 bg-red-50 text-red-800">
        <h3 className="font-medium">Erro ao enviar e-mail</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (showForm) {
    return (
      <EmailForm 
        onSubmit={(data) => {
          setEmailData(data);
          setShowForm(false);
        }}
        onCancel={() => {
          // Se já tiver dados, apenas fecha o formulário
          if (to || subject || body) {
            setShowForm(false);
          }
        }}
      />
    );
  }

  const displayTo = emailData.to || to;
  const displayCc = emailData.cc || cc;
  const displaySubject = emailData.subject || subject;
  const displayBody = emailData.body || body;

  return (
    <motion.div
      className="border border-blue-200 rounded-md overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-blue-50 p-3 border-b border-blue-200 flex justify-between items-center">
        <h3 className="font-medium text-blue-800">E-mail {status === "sent" ? "Enviado" : "Preparado"}</h3>
        {status !== "sent" && (
          <button 
            onClick={() => setShowForm(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Editar
          </button>
        )}
      </div>
      <div className="p-4 bg-white">
        <div className="mb-2">
          <span className="font-medium text-gray-700">Para:</span> {displayTo}
        </div>
        {displayCc && (
          <div className="mb-2">
            <span className="font-medium text-gray-700">Cc:</span> {displayCc}
          </div>
        )}
        <div className="mb-2">
          <span className="font-medium text-gray-700">Assunto:</span> {displaySubject}
        </div>
        <div className="border-t border-gray-100 pt-2 mt-2">
          <p className="whitespace-pre-line">{displayBody}</p>
        </div>
        {status === "sent" && (
          <div className="mt-3 text-green-600 text-sm">
            ✓ E-mail enviado com sucesso
          </div>
        )}
      </div>
    </motion.div>
  );
};