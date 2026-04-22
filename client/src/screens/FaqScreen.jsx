import { useState } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";

const faqs = [
  {
    question: "How do I use the Crop Diagnose feature?",
    answer: "Go to the Diagnose tab, point your camera at the diseased crop leaf, or upload an image from your gallery. KisanAI will scan the leaf and provide a diagnosis along with treatment steps."
  },
  {
    question: "Are the market prices accurate?",
    answer: "Market prices are fetched periodically from regional mandis. However, localized factors can affect final pricing, so use the data as an indicator while verifying with your local buyers."
  },
  {
    question: "How can I change the app language?",
    answer: "Go to the Profile tab and tap on 'Change Language'. You can select between English, Hindi, Marathi, Telugu, Tamil, Kannada, Bengali, and Punjabi."
  },
  {
    question: "Does the Farm Assistant Chat cost money?",
    answer: "No, the Farm Assistant is completely free for you to use. You can ask any farming, irrigation, or pest-related questions anytime."
  },
  {
    question: "Is my farm data private?",
    answer: "Yes, your data is securely stored. We only use local weather and crop data to provide customized recommendations for your specific farm."
  }
];

export default function FaqScreen() {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "24px" }}>
      {faqs.map((faq, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div key={index} className="card-elevated" style={{ padding: "16px" }}>
            <button
              onClick={() => toggleExpand(index)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "left",
                cursor: "pointer",
                padding: 0
              }}
            >
              <div className="text-md" style={{ fontWeight: 700, color: "#1b5e20", paddingRight: 12 }}>
                {faq.question}
              </div>
              <div>
                {isExpanded ? (
                  <MdKeyboardArrowUp size={24} color="#757575" />
                ) : (
                  <MdKeyboardArrowDown size={24} color="#757575" />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="text-sm mt-12" style={{ color: "#333", lineHeight: 1.5, borderTop: "1px solid #e0e0e0", paddingTop: 12 }}>
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
