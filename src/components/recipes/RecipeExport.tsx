'use client';

import { Download, FileText, Printer } from 'lucide-react';
import { RecipeWithIngredients } from '@/types/recipe';
import toast from 'react-hot-toast';

interface RecipeExportProps {
  recipe: RecipeWithIngredients;
}

export default function RecipeExport({ recipe }: RecipeExportProps) {
  const exportAsText = () => {
    const text = generateRecipeText(recipe);
    
    // Create blob and download
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Рецепт экспортирован!');
  };

  const copyToClipboard = () => {
    const text = generateRecipeText(recipe);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Рецепт скопирован в буфер обмена!');
    });
  };

  const printRecipe = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Не удалось открыть окно печати');
      return;
    }

    const html = generateRecipeHTML(recipe);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    
    toast.success('Открыто окно печати');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={exportAsText}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Экспорт .txt
      </button>

      <button
        onClick={copyToClipboard}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
      >
        <FileText className="w-4 h-4" />
        Копировать
      </button>

      <button
        onClick={printRecipe}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
      >
        <Printer className="w-4 h-4" />
        Печать
      </button>
    </div>
  );
}

function generateRecipeText(recipe: RecipeWithIngredients): string {
  let text = `${recipe.name}\n`;
  text += '='.repeat(recipe.name.length) + '\n\n';

  if (recipe.description) {
    text += `${recipe.description}\n\n`;
  }

  text += `⏱ Время приготовления: ${recipe.cooking_time} минут\n`;
  text += `👥 Порций: ${recipe.servings}\n`;
  
  if (recipe.categories) {
    text += `🏷 Категории: ${recipe.categories}\n`;
  }
  
  text += '\n';

  text += 'ИНГРЕДИЕНТЫ:\n';
  text += '-'.repeat(50) + '\n';
  recipe.ingredients.forEach((ing) => {
    const optional = ing.optional ? ' (опционально)' : '';
    text += `• ${ing.quantity} ${ing.unit} ${ing.product.name}${optional}\n`;
    if (ing.notes) {
      text += `  Примечание: ${ing.notes}\n`;
    }
  });
  text += '\n';

  text += 'ИНСТРУКЦИИ:\n';
  text += '-'.repeat(50) + '\n';
  const steps = recipe.instructions.split('||').map(s => s.trim()).filter(Boolean);
  steps.forEach((step, idx) => {
    text += `${idx + 1}. ${step}\n\n`;
  });

  if (recipe.tags) {
    text += `\nТеги: ${recipe.tags}\n`;
  }

  return text;
}

function generateRecipeHTML(recipe: RecipeWithIngredients): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${recipe.name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: #ea580c;
      border-bottom: 3px solid #ea580c;
      padding-bottom: 10px;
    }
    h2 {
      color: #333;
      margin-top: 30px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .meta {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .meta-item {
      margin: 5px 0;
    }
    ul {
      list-style: none;
      padding-left: 0;
    }
    li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    li:before {
      content: "• ";
      color: #ea580c;
      font-weight: bold;
      margin-right: 8px;
    }
    .step {
      margin: 15px 0;
      padding-left: 30px;
    }
    .step-number {
      font-weight: bold;
      color: #ea580c;
      margin-right: 10px;
    }
    @media print {
      body {
        margin: 20px;
      }
    }
  </style>
</head>
<body>
  <h1>${recipe.name}</h1>
  
  ${recipe.description ? `<p><em>${recipe.description}</em></p>` : ''}
  
  <div class="meta">
    <div class="meta-item">⏱ <strong>Время приготовления:</strong> ${recipe.cooking_time} минут</div>
    <div class="meta-item">👥 <strong>Порций:</strong> ${recipe.servings}</div>
    ${recipe.categories ? `<div class="meta-item">🏷 <strong>Категории:</strong> ${recipe.categories}</div>` : ''}
  </div>

  <h2>Ингредиенты</h2>
  <ul>
    ${recipe.ingredients.map(ing => `
      <li>
        ${ing.quantity} ${ing.unit} ${ing.product.name}${ing.optional ? ' (опционально)' : ''}
        ${ing.notes ? `<br><small style="color: #666;">Примечание: ${ing.notes}</small>` : ''}
      </li>
    `).join('')}
  </ul>

  <h2>Инструкции</h2>
  ${recipe.instructions.split('||').map((step, idx) => `
    <div class="step">
      <span class="step-number">${idx + 1}.</span>
      ${step.trim()}
    </div>
  `).join('')}

  ${recipe.tags ? `<p style="margin-top: 30px;"><strong>Теги:</strong> ${recipe.tags}</p>` : ''}
</body>
</html>
  `;
}
