"use client";

import { motion } from "framer-motion";

type EmailProps = {
  to?: string;
  subject?: string;
  body?: string;
  status?: string;
  error?: string;
};

export const Email = ({ to, subject, body, status, error }: EmailProps) => {
  if (error) {
    return (
      <div className="border border-red-200 rounded-md p-4 bg-red-50 text-red-800">
        <h3 className="font-medium">Erro ao enviar e-mail</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!to && !subject && !body) {
    return (
      <div className="border border-gray-200 rounded-md p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <motion.div
      className="border border-blue-200 rounded-md overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-blue-50 p-3 border-b border-blue-200">
        <h3 className="font-medium text-blue-800">E-mail {status === "sent" ? "Enviado" : "Preparado"}</h3>
      </div>
      <div className="p-4 bg-white">
        <div className="mb-2">
          <span className="font-medium text-gray-700">Para:</span> {to}
        </div>
        <div className="mb-2">
          <span className="font-medium text-gray-700">Assunto:</span> {subject}
        </div>
        <div className="border-t border-gray-100 pt-2 mt-2">
          <p className="whitespace-pre-line">{body}</p>
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