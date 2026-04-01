import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import { GiSpinningSword, GiCrystalGrowth, GiRibbonShield, GiFlowerPot, GiCrown, GiSnowflake1, GiWaveSurfer } from "react-icons/gi";
import "./FabricSelectPage.css";

const FABRICS = [
  { name: "Net (China)", icon: <GiSpinningSword />, description: "Lightweight & elegant" },
  { name: "Pure China Krinkle", icon: <GiCrystalGrowth />, description: "Rich textured finish" },
  { name: "Tussle Silk", icon: <GiRibbonShield />, description: "Luxurious silk blend" },
  { name: "Organza", icon: <GiFlowerPot />, description: "Sheer & sophisticated" },
  { name: "Barosha", icon: <GiCrown />, description: "Traditional elegance" },
  { name: "Velvet (Winter)", icon: <GiSnowflake1 />, description: "Warm & royal" },
  { name: "Shafon Krinkle", icon: <GiWaveSurfer />, description: "Flowing & graceful" },
];

const FabricSelectPage = () => {
  const { categoryType } = useParams();
  const navigate = useNavigate();

  const categoryLabel = categoryType === "ready-made" ? "Ready-Made Collection" : "Customized Designs";

  return (
    <div className="fabric-page">
      <div className="container">
        <button className="fabric-back" onClick={() => navigate("/")}>
          <HiArrowLeft /> Back to Home
        </button>

        <div className="page-header">
          <h1 className="gradient-text">{categoryLabel}</h1>
          <p>Select a fabric type to explore our collection</p>
        </div>

        <div className="fabric-grid">
          {FABRICS.map((fabric, idx) => (
            <Link
              key={fabric.name}
              to={`/category/${categoryType}/fabric/${encodeURIComponent(fabric.name)}`}
              className={`fabric-card fabric-${idx} animate-slideUp`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="fabric-card-visual">
                <div className="fabric-card-bg">
                  {fabric.icon}
                </div>
              </div>
              <div className="fabric-card-body">
                <h3>{fabric.name}</h3>
                <p>{fabric.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FabricSelectPage;
