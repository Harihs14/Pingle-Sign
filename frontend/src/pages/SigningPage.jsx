import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
// Removed react-easy-crop - using simpler image upload approach
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Type,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Info,
  Download,
  PenTool,
} from "lucide-react";
import PingleLogo from "../assets/pingle-logo.png";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });

// Simple image resize function - maintains aspect ratio
// Only resizes if image is too large, otherwise preserves original size
const resizeSignatureImage = async (
  imageSrc,
  maxWidth = 2000, // Increased to preserve larger signatures
  maxHeight = 1000 // Increased to preserve larger signatures
) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");

  // Calculate dimensions maintaining aspect ratio
  let width = image.width;
  let height = image.height;

  // Only resize if image exceeds maximum dimensions
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = width * ratio;
    height = height * ratio;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Use high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/png");
};

const generateSignatureImageFromText = async (
  text,
  fontId,
  fontFamilies,
  options = {}
) => {
  const fontFamily =
    fontFamilies[fontId] || '"Lucida Handwriting", "Brush Script MT", cursive';
  let paddingX = options.paddingX ?? 20;
  let paddingY = options.paddingY ?? 16;
  let fontSize = options.fontSize ?? 64;
  const maxWidth = options.maxWidth ?? 600;
  const maxHeight = options.maxHeight ?? 220;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const measure = () => {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const width = metrics.width + paddingX * 2;
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
    const height = ascent + descent + paddingY * 2;
    return { width, height, ascent, descent };
  };

  let { width, height } = measure();
  let attempts = 0;
  while ((width > maxWidth || height > maxHeight) && attempts < 6) {
    const widthScale = maxWidth / width;
    const heightScale = maxHeight / height;
    const scale = Math.min(widthScale, heightScale, 1);
    fontSize *= scale;
    paddingX *= scale;
    paddingY *= scale;
    ({ width, height } = measure());
    attempts += 1;
  }

  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000000";
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.fillText(text, 0, 0);

  return canvas.toDataURL("image/png");
};

const SigningPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading | ready | completed | already | error
  const [statusMessage, setStatusMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [document, setDocument] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [signatureType, setSignatureType] = useState("text");
  const [signatureText, setSignatureText] = useState("");
  const [signatureImages, setSignatureImages] = useState({});
  const [signatureStyles, setSignatureStyles] = useState({});
  const [signatureTypesByPlaceholder, setSignatureTypesByPlaceholder] =
    useState({});
  const [activeSignaturePlaceholder, setActiveSignaturePlaceholder] =
    useState(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureModalTab, setSignatureModalTab] = useState("text");
  const [selectedSignatureFont, setSelectedSignatureFont] =
    useState("script-1");
  const [fieldValues, setFieldValues] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError] = useState("");
  const [completionDetails, setCompletionDetails] = useState(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const documentContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnSignature, setDrawnSignature] = useState(null);
  const [pageWidth, setPageWidth] = useState(600);
  const [isMobile, setIsMobile] = useState(false);

  const signatureFontOptions = [
    {
      id: "script-1",
      label: "Elegant",
      className: "font-signature-elegant",
    },
    {
      id: "script-2",
      label: "Modern",
      className: "font-signature-modern",
    },
    {
      id: "script-3",
      label: "Classic",
      className: "font-signature-classic",
    },
  ];

  const signatureFontFamilies = {
    "script-1":
      '"Lucida Handwriting", "Brush Script MT", "Segoe Script", cursive',
    "script-2":
      '"Segoe Script", "Bradley Hand", "Brush Script MT", "Pacifico", cursive',
    "script-3":
      '"Snell Roundhand", "Apple Chancery", "Zapfino", "Lucida Calligraphy", cursive',
  };

  useEffect(() => {
    if (token) {
      loadDocument();
    }
  }, [token]);

  useEffect(() => {
    if (document?.signer_name && !signatureText) {
      setSignatureText(document.signer_name);
    }
  }, [document]);

  useEffect(() => {
    const updateWidth = () => {
      if (documentContainerRef.current) {
        const width =
          documentContainerRef.current.clientWidth || window.innerWidth || 800;
        setPageWidth(Math.min(width, 1100));
      }
      // Track mobile state (less than 768px = md breakpoint)
      setIsMobile(window.innerWidth < 768);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  useEffect(() => {
    if (!documentContainerRef.current) return;
    const timer = requestAnimationFrame(() => {
      if (documentContainerRef.current) {
        const width =
          documentContainerRef.current.clientWidth || window.innerWidth || 800;
        setPageWidth(Math.min(width, 1100));
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [document]);

  const setSignatureForPlaceholder = (
    placeholder,
    type,
    value,
    options = {}
  ) => {
    if (!placeholder) return;
    const fieldKey = resolveFieldKey(placeholder);

    setFieldValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));

    setSignatureTypesByPlaceholder((prev) => ({
      ...prev,
      [placeholder.id]: type,
    }));

    if (type === "text") {
      setSignatureImages((prev) => {
        const next = { ...prev };
        delete next[placeholder.id];
        return next;
      });
      if (options.fontId) {
        setSignatureStyles((prev) => ({
          ...prev,
          [placeholder.id]: options.fontId,
        }));
      }
      setSignatureType("text");
      setSignatureText(value);
    } else if (type === "image") {
      setSignatureImages((prev) => ({
        ...prev,
        [placeholder.id]: value,
      }));
      setSignatureStyles((prev) => {
        const next = { ...prev };
        delete next[placeholder.id];
        return next;
      });
      setSignatureType("image");
    } else if (type === "draw") {
      setSignatureImages((prev) => ({
        ...prev,
        [placeholder.id]: value,
      }));
      setSignatureStyles((prev) => {
        const next = { ...prev };
        delete next[placeholder.id];
        return next;
      });
      setSignatureType("draw");
      setDrawnSignature(value);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageSrc = e.target.result;
        setImagePreview(imageSrc);

        // Process image - only resize if too large, otherwise preserve original size
        try {
          // Use larger limits to preserve original signature size
          const resizedImage = await resizeSignatureImage(imageSrc, 2000, 1000);
          if (activeSignaturePlaceholder) {
            setSignatureForPlaceholder(
              activeSignaturePlaceholder,
              "image",
              resizedImage
            );
            setFormError("");
          }
        } catch (error) {
          console.error("Error processing image:", error);
          setFormError("Failed to process image. Please try another image.");
        }
      };
      reader.onerror = () => {
        setFormError("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      setFormError("Failed to upload image. Please try again.");
    }
  };

  // Drawing functions
  useEffect(() => {
    if (!canvasRef.current || signatureModalTab !== "draw") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size
    canvas.width = 600;
    canvas.height = 200;

    // Set drawing style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Load existing drawn signature if available
    const existingImage = activeSignaturePlaceholder
      ? signatureImages[activeSignaturePlaceholder.id]
      : null;

    if (existingImage) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = existingImage;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [signatureModalTab, activeSignaturePlaceholder?.id, signatureImages]);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();

    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Save the drawn signature
    const dataURL = canvas.toDataURL("image/png");
    setDrawnSignature(dataURL);

    if (activeSignaturePlaceholder) {
      setSignatureForPlaceholder(activeSignaturePlaceholder, "draw", dataURL);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnSignature(null);

    if (activeSignaturePlaceholder) {
      setSignatureImages((prev) => {
        const next = { ...prev };
        delete next[activeSignaturePlaceholder.id];
        return next;
      });
      setSignatureTypesByPlaceholder((prev) => {
        const next = { ...prev };
        delete next[activeSignaturePlaceholder.id];
        return next;
      });
    }
  };

  const openSignatureDialog = (placeholder) => {
    if (!placeholder) return;

    setActiveSignaturePlaceholder(placeholder);

    const currentType = signatureTypesByPlaceholder[placeholder.id] || "text";
    setSignatureModalTab(currentType);
    setSignatureType(currentType);

    if (currentType === "text") {
      const fieldKey = resolveFieldKey(placeholder);
      const existingValue =
        fieldValues[fieldKey] || signatureText || document?.signer_name || "";
      setSignatureText(existingValue);
    } else if (currentType === "draw") {
      const existingDraw = signatureImages[placeholder.id];
      setDrawnSignature(existingDraw || null);
    }

    const currentFont =
      signatureStyles[placeholder.id] || selectedSignatureFont;
    setSelectedSignatureFont(currentFont);

    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setSignatureDialogOpen(true);
  };

  const closeSignatureDialog = () => {
    // Save drawn signature if exists
    if (signatureModalTab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      // Check if canvas has any content by checking if it's not empty
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some((channel) => channel !== 0);

      if (hasContent) {
        const dataURL = canvas.toDataURL("image/png");
        if (activeSignaturePlaceholder) {
          setSignatureForPlaceholder(
            activeSignaturePlaceholder,
            "draw",
            dataURL
          );
        }
      }
    }

    setSignatureDialogOpen(false);
    setActiveSignaturePlaceholder(null);
    setImagePreview(null);
    setIsDrawing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSignatureNameChange = (value) => {
    setSignatureText(value);
    setFormError("");
    if (activeSignaturePlaceholder) {
      setSignatureForPlaceholder(activeSignaturePlaceholder, "text", value, {
        fontId: selectedSignatureFont,
      });
      const options = computeSignatureImageOptions(activeSignaturePlaceholder);
      generateSignatureImageFromText(
        value,
        signatureStyles[activeSignaturePlaceholder.id] || selectedSignatureFont,
        signatureFontFamilies,
        options
      )
        .then((image) => {
          setSignatureImages((prev) => ({
            ...prev,
            [activeSignaturePlaceholder.id]: image,
          }));
        })
        .catch(() => {});
    }
  };

  const handleSignatureFontSelect = (fontId) => {
    setSelectedSignatureFont(fontId);
    if (activeSignaturePlaceholder) {
      setSignatureForPlaceholder(
        activeSignaturePlaceholder,
        "text",
        signatureText,
        {
          fontId,
        }
      );
      const options = computeSignatureImageOptions(activeSignaturePlaceholder);
      generateSignatureImageFromText(
        signatureText,
        fontId,
        signatureFontFamilies,
        options
      )
        .then((image) => {
          setSignatureImages((prev) => ({
            ...prev,
            [activeSignaturePlaceholder.id]: image,
          }));
        })
        .catch(() => {});
    }
  };

  const clearSignatureForPlaceholder = () => {
    if (!activeSignaturePlaceholder) return;
    const fieldKey = resolveFieldKey(activeSignaturePlaceholder);

    setFieldValues((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });

    setSignatureTypesByPlaceholder((prev) => {
      const next = { ...prev };
      delete next[activeSignaturePlaceholder.id];
      return next;
    });

    setSignatureImages((prev) => {
      const next = { ...prev };
      delete next[activeSignaturePlaceholder.id];
      return next;
    });

    setSignatureStyles((prev) => {
      const next = { ...prev };
      delete next[activeSignaturePlaceholder.id];
      return next;
    });

    setSignatureText("");
    setSignatureType("text");
    setSignatureModalTab("text");
    setFormError("");
    setImagePreview(null);
    setDrawnSignature(null);
    clearCanvas();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadDocument = async () => {
    try {
      setStatus("loading");
      setStatusMessage("");
      setCompletionDetails(null);

      // Use the centralized API service
      const { documentsApi } = await import("@/services/api");
      let data;

      try {
        data = await documentsApi.getByToken(token);
      } catch (error) {
        // Suppress console errors for expected 410 responses (already signed documents)
        if (error.status === 410 && error.isExpected) {
          // This is expected behavior, not an error
        } else {
          console.error("Error loading document:", error);
        }
        // Handle different error statuses
        if (error.status === 404 || error.message?.includes("404")) {
          setStatus("already");
          setStatusMessage(
            "This signing link is no longer active. The document may have been completed or the link has expired."
          );
          setDocument(null);
          return;
        }

        // Handle 410 (Gone) - document already signed or expired
        if (error.status === 410 || error.data?.status) {
          console.log("Received 410 error, data:", error.data);
          const status = error.data?.status || "completed";
          // Store document info even if completed, so we can download it
          // Try multiple possible field names
          const documentId =
            error.data?.documentId || error.data?.id || error.data?.document_id;
          const templateName =
            error.data?.templateName || error.data?.template_name;

          console.log("Extracted document info:", {
            documentId,
            templateName,
            errorData: error.data,
          });

          if (documentId) {
            setDocument({
              id: documentId,
              template_name: templateName || null,
            });
            console.log("Stored document info for download:", {
              id: documentId,
              template_name: templateName,
            });
          } else {
            console.warn("No document ID in 410 response. Full error:", error);
            // Don't set to null yet - we'll try to fetch it when download is clicked
          }

          if (status === "completed") {
            setStatus("already");
            setStatusMessage(
              "This document has already been signed and completed."
            );
          } else if (status === "expired") {
            setStatus("already");
            setStatusMessage(
              "This signing link has expired. Please request a new signing link."
            );
          } else {
            setStatus("already");
            setStatusMessage("This signing link is no longer active.");
          }
          return;
        }

        throw error; // Re-throw other errors
      }

      // Validate PDF data
      if (!data || !data.pdfData) {
        setStatus("error");
        setStatusMessage("PDF data is missing from the document.");
        setDocument(null);
        return;
      }

      // Validate and clean base64 encoding
      try {
        // Try to decode a small portion to validate base64
        if (data.pdfData.length > 0) {
          // Remove data URI prefix if present and clean whitespace
          const base64Data = data.pdfData
            .replace(/^data:application\/pdf;base64,/, "")
            .trim()
            .replace(/\s/g, "");
          // Validate base64 characters (allow padding with =)
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
            throw new Error("Invalid base64 characters");
          }
          // Store cleaned base64 data
          data.pdfData = base64Data;
        }
      } catch (error) {
        console.error("Invalid PDF data format:", error);
        setStatus("error");
        setStatusMessage(
          "The PDF data is corrupted or invalid. Please contact support."
        );
        setDocument(null);
        return;
      }

      setDocument(data);
      setStatus("ready");

      if (data.data) {
        const prefill = {};
        data.placeholders?.forEach((placeholder) => {
          const fieldKey =
            placeholder.apiKey ||
            placeholder.label?.toLowerCase().replace(/\s+/g, "_");
          if (!fieldKey) return;
          if (
            placeholder.type === "text" ||
            placeholder.type === "checkbox" ||
            placeholder.type === "signdate" ||
            placeholder.type === "fullname" ||
            placeholder.type === "email"
          ) {
            if (data.data[fieldKey] !== undefined) {
              prefill[fieldKey] = data.data[fieldKey];
            } else if (placeholder.type === "signdate") {
              prefill[fieldKey] = new Date().toLocaleDateString();
            }
          }
        });
        setFieldValues(prefill);
      }
    } catch (error) {
      console.error("Error loading document:", error);
      setStatus("error");
      setStatusMessage("Something went wrong while loading the document.");
      setDocument(null);
    }
  };
  const handleSignatureFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!activeSignaturePlaceholder) {
      return;
    }

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("Please upload a valid image file for your signature.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFormError("Signature image must be under 2MB.");
      event.target.value = "";
      return;
    }

    handleImageUpload({ target: { files: [file] } });
  };

  const handleSubmit = async () => {
    if (!document) return;
    setFormError("");

    // Validate all signature and initial fields
    const signaturePlaceholders =
      document.placeholders?.filter(
        (p) => p.type === "signature" || p.type === "initial"
      ) || [];

    if (signaturePlaceholders.length === 0) {
      setValidationMessage("No signature fields found in this document.");
      setValidationDialogOpen(true);
      return;
    }

    // Check if all signature fields are filled
    const missingSignatures = [];
    for (const placeholder of signaturePlaceholders) {
      const fieldKey = resolveFieldKey(placeholder);
      const placeholderType =
        signatureTypesByPlaceholder[placeholder.id] ||
        (signatureImages[placeholder.id] ? "image" : "text");

      if (placeholderType === "image" || placeholderType === "draw") {
        if (!signatureImages[placeholder.id]) {
          missingSignatures.push(placeholder.label || "signature");
        }
      } else {
        const textValue = fieldValues[fieldKey] || "";
        if (!textValue.trim()) {
          missingSignatures.push(placeholder.label || "signature");
        }
      }
    }

    // Check if all checkbox fields are checked
    const checkboxPlaceholders =
      document.placeholders?.filter((p) => p.type === "checkbox") || [];
    const missingCheckboxes = [];
    for (const placeholder of checkboxPlaceholders) {
      const fieldKey = resolveFieldKey(placeholder);
      const isChecked = fieldValues[fieldKey] === true;
      if (!isChecked) {
        missingCheckboxes.push(placeholder.label || "checkbox");
      }
    }

    // Show validation dialog if there are missing fields
    if (missingSignatures.length > 0 || missingCheckboxes.length > 0) {
      const missingFields = [];
      if (missingSignatures.length > 0) {
        missingFields.push(
          `Missing signatures: ${missingSignatures.join(", ")}`
        );
      }
      if (missingCheckboxes.length > 0) {
        missingFields.push(`Unchecked boxes: ${missingCheckboxes.join(", ")}`);
      }

      setValidationMessage(
        `All the required fields have not been signed. Please complete the following before submitting:\n\n${missingFields.join(
          "\n"
        )}`
      );
      setValidationDialogOpen(true);
      return;
    }

    // Get signature data for the first signature placeholder (for backward compatibility)
    const signaturePlaceholder = signaturePlaceholders[0];
    let signatureData = null;
    let signatureTypeToSend = signatureType;

    if (signaturePlaceholder) {
      const fieldKey = resolveFieldKey(signaturePlaceholder);
      const placeholderType =
        signatureTypesByPlaceholder[signaturePlaceholder.id] || signatureType;

      if (placeholderType === "image" || placeholderType === "draw") {
        signatureData = signatureImages[signaturePlaceholder.id];
        signatureTypeToSend = "image"; // Draw signatures are sent as images
      } else {
        const textValue = fieldValues[fieldKey] || "";
        const trimmed = textValue.trim();
        setFieldValues((prev) => ({
          ...prev,
          [fieldKey]: trimmed,
        }));

        let base64Signature = signatureImages[signaturePlaceholder.id];
        if (!base64Signature) {
          const fontId =
            signatureStyles[signaturePlaceholder.id] || selectedSignatureFont;
          const options = computeSignatureImageOptions(signaturePlaceholder);
          try {
            base64Signature = await generateSignatureImageFromText(
              trimmed,
              fontId,
              signatureFontFamilies,
              options
            );
            setSignatureImages((prev) => ({
              ...prev,
              [signaturePlaceholder.id]: base64Signature,
            }));
          } catch (error) {
            console.error("Error generating signature image:", error);
          }
        }

        if (base64Signature) {
          signatureData = base64Signature;
          signatureTypeToSend = "image";
        } else {
          signatureData = trimmed;
          signatureTypeToSend = "text";
        }
      }
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        `${API_BASE_URL}/api/documents/${document.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signatureData,
            signatureType: signatureTypeToSend,
            fieldValues: (() => {
              // Filter out unchecked checkboxes - only include checked checkboxes
              const filtered = {};
              const checkboxPlaceholders =
                document.placeholders?.filter((p) => p.type === "checkbox") ||
                [];

              // Add all non-checkbox field values
              Object.keys(fieldValues).forEach((key) => {
                const isCheckboxField = checkboxPlaceholders.some((p) => {
                  const fieldKey = resolveFieldKey(p);
                  return fieldKey === key;
                });
                if (!isCheckboxField) {
                  filtered[key] = fieldValues[key];
                }
              });

              // Only add checked checkboxes
              checkboxPlaceholders.forEach((placeholder) => {
                const fieldKey = resolveFieldKey(placeholder);
                if (fieldValues[fieldKey] === true) {
                  filtered[fieldKey] = true;
                }
              });

              return filtered;
            })(),
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setCompletionDetails(result);
        setStatus("completed");
        setStatusMessage("Document signed successfully.");
      } else {
        const error = await response.json();
        setFormError(
          error.error || "Failed to sign document. Please try again."
        );
      }
    } catch (error) {
      console.error("Error signing document:", error);
      setFormError("Failed to sign document. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveFieldKey = (placeholder) =>
    placeholder.apiKey ||
    placeholder.label?.toLowerCase().replace(/\s+/g, "_") ||
    placeholder.id;

  const getPlaceholderValue = (placeholder) => {
    const fieldKey = resolveFieldKey(placeholder);
    if (placeholder.type === "fullname") {
      return (
        fieldValues[fieldKey] ||
        document?.signer_name ||
        document?.data?.[fieldKey] ||
        ""
      );
    }
    if (placeholder.type === "email") {
      return (
        fieldValues[fieldKey] ||
        document?.signer_email ||
        document?.data?.[fieldKey] ||
        ""
      );
    }
    if (placeholder.type === "signdate") {
      return (
        fieldValues[fieldKey] ||
        document?.data?.[fieldKey] ||
        new Date().toLocaleDateString()
      );
    }
    if (placeholder.type === "signature" || placeholder.type === "initial") {
      const typeForPlaceholder =
        signatureTypesByPlaceholder[placeholder.id] ||
        (signatureImages[placeholder.id] ? "image" : "text");
      if (typeForPlaceholder === "image") {
        return signatureImages[placeholder.id] || "";
      }
      // Don't show signer name as default - only show if user has actually signed
      return fieldValues[fieldKey] || "";
    }
    if (placeholder.type === "text") {
      return (
        fieldValues[fieldKey] ||
        fieldValues[placeholder.id] ||
        document?.data?.[fieldKey] ||
        ""
      );
    }
    if (placeholder.type === "checkbox") {
      return (
        fieldValues[fieldKey] ||
        fieldValues[placeholder.id] ||
        document?.data?.[fieldKey] ||
        false
      );
    }
    return "";
  };

  const computeSignatureImageOptions = (placeholder) => {
    if (!placeholder) return {};
    const deviceRatio = window.devicePixelRatio || 1;
    const targetWidth = Math.max(
      placeholder.width * pageWidth * deviceRatio,
      240
    );
    const targetHeight = Math.max(
      placeholder.height * pageWidth * deviceRatio,
      120
    );
    return {
      maxWidth: targetWidth,
      maxHeight: targetHeight,
    };
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "completed") {
    const handleDownload = async () => {
      if (!document?.id) {
        console.error("Document ID not available");
        return;
      }

      try {
        console.log("Starting download for document ID:", document.id);
        const response = await fetch(
          `${API_BASE_URL}/api/documents/${document.id}/download`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Download failed:", response.status, errorText);
          throw new Error(`Failed to download PDF: ${response.status}`);
        }

        // Check Content-Type header
        const contentType = response.headers.get("Content-Type");
        console.log("Response Content-Type:", contentType);
        
        const blob = await response.blob();
        console.log("Blob received, size:", blob.size, "type:", blob.type);
        
        // Ensure blob has correct MIME type
        const pdfBlob = blob.type === "application/pdf" 
          ? blob 
          : new Blob([blob], { type: "application/pdf" });
        
        const url = window.URL.createObjectURL(pdfBlob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${document.template_name || "document"}-signed.pdf`;
        link.style.display = "none";
        window.document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(link);
        console.log("Download initiated successfully");
      } catch (error) {
        console.error("Error downloading PDF:", error);
        setFormError("Failed to download PDF. Please try again.");
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-xl w-full shadow-lg border-border/60">
          <CardHeader className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 md:h-12 md:w-12 text-green-500" />
            <CardTitle className="text-xl md:text-2xl font-semibold">
              Document Signed Successfully
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-muted-foreground">
              {statusMessage ||
                "Thank you! The document has been signed and recorded."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs md:text-sm text-muted-foreground text-center">
            {completionDetails?.signedPdfPath && (
              <p>
                A copy of the signed PDF has been saved. Reference:{" "}
                <span className="font-medium">
                  {completionDetails.signedPdfPath}
                </span>
              </p>
            )}
            <div className="flex flex-col gap-3 items-center">
              <Button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Download className="h-4 w-4" />
                Download Signed PDF
              </Button>
              {formError && (
                <p className="text-sm text-red-600 mt-2">{formError}</p>
              )}
            </div>
            <p>
              You may now close this window. If you need to sign another
              document, use the link provided in the original email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "already" || status === "error") {
    const isCompleted = statusMessage?.includes("already been signed");
    const isExpired = statusMessage?.includes("expired");

    const handleDownload = async () => {
      // Try to get document ID from state first
      let docId = document?.id;
      let templateName = document?.template_name;

      // If not available, try to fetch from token
      if (!docId && token) {
        console.log("Document ID not in state, trying to fetch from token...");
        try {
          const { documentsApi } = await import("@/services/api");
          // This will throw a 410 error, but we can extract the document ID from it
          try {
            await documentsApi.getByToken(token);
          } catch (fetchError) {
            if (fetchError.status === 410 && fetchError.data) {
              docId = fetchError.data.documentId || fetchError.data.id;
              templateName =
                fetchError.data.templateName || fetchError.data.template_name;
              if (docId) {
                // Update state for future use
                setDocument({
                  id: docId,
                  template_name: templateName || null,
                });
                console.log("Fetched document ID from token:", docId);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching document ID:", error);
        }
      }

      if (!docId) {
        setFormError(
          "Document ID not available for download. Please try refreshing the page."
        );
        console.error("Document ID not available:", { document, token });
        return;
      }

      downloadPdfById(docId, templateName);
    };

    const downloadPdfById = async (docId, templateName) => {
      try {
        console.log("Starting download for document ID:", docId);
        const response = await fetch(
          `${API_BASE_URL}/api/documents/${docId}/download`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Download failed:", response.status, errorText);
          throw new Error(`Failed to download PDF: ${response.status}`);
        }

        // Check Content-Type header
        const contentType = response.headers.get("Content-Type");
        console.log("Response Content-Type:", contentType);
        
        const blob = await response.blob();
        console.log("Blob received, size:", blob.size, "type:", blob.type);
        
        // Ensure blob has correct MIME type
        const pdfBlob = blob.type === "application/pdf" 
          ? blob 
          : new Blob([blob], { type: "application/pdf" });
        
        const url = window.URL.createObjectURL(pdfBlob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `${templateName || "document"}-signed.pdf`;
        link.style.display = "none";
        window.document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(link);
        console.log("Download initiated successfully");
      } catch (error) {
        console.error("Error downloading PDF:", error);
        setFormError("Failed to download PDF. Please try again.");
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-lg w-full shadow-md border-border/60">
          <CardHeader className="space-y-3 text-center">
            <Info className="mx-auto h-8 w-8 md:h-10 md:w-10 text-primary" />
            <CardTitle className="text-lg md:text-xl font-semibold">
              {isCompleted
                ? "Document Already Signed"
                : isExpired
                ? "Signing Link Expired"
                : status === "already"
                ? "Signing Link Unavailable"
                : "Unable to Load Document"}
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-muted-foreground">
              {statusMessage ||
                "We couldn't open this document. Please reach out to the sender for assistance."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs md:text-sm text-muted-foreground text-center space-y-3">
            {isCompleted ? (
              <div className="space-y-3">
                <p className="text-green-600 font-medium">
                  ✓ This document has been successfully signed and completed.
                </p>
                <div className="flex flex-col gap-3 items-center">
                  <Button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download Signed PDF
                  </Button>
                  {formError && (
                    <p className="text-sm text-red-600 mt-2">{formError}</p>
                  )}
                </div>
                <p>
                  If you need to sign a new document, please contact the
                  document owner to request a new signing link.
                </p>
              </div>
            ) : isExpired ? (
              <p>
                This signing link has expired. Please contact the document owner
                and request a new signing link.
              </p>
            ) : (
              <p>
                If you believe this is a mistake, contact the document owner and
                request a new signing request.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const activeSignatureImage =
    activeSignaturePlaceholder && signatureImages[activeSignaturePlaceholder.id]
      ? signatureImages[activeSignaturePlaceholder.id]
      : null;

  const signatureSampleName =
    signatureText || document?.signer_name || "Your Name";

  // Removed signatureAspectRatio - no longer needed without crop

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 shadow-lg bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-10">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <img
              src={PingleLogo}
              alt="Pingle Logo"
              className="h-8 w-auto md:h-9"
              draggable={false}
            />
          </div>

          {/* Center: Document Title */}
          <div className="hidden sm:flex flex-1 justify-center">
            <h1 className="truncate text-center text-sm font-semibold text-slate-900 sm:text-base md:text-lg lg:text-xl">
              {document.template_name}
            </h1>
          </div>

          {/* Right: Recipient + Button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="truncate text-xs font-medium text-slate-900 md:text-sm">
                {document.signer_name || "Recipient"}
              </span>
              <span className="truncate text-[11px] text-slate-500 md:text-xs">
                {document.signer_email || "Secure session"}
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400/60 focus-visible:ring-offset-2 md:h-10 md:px-5 md:text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Submitting...</span>
                  <span className="sm:hidden">Submit</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign & Submit</span>
                  <span className="sm:hidden">Sign</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Title + Recipient */}
        <div className="sm:hidden px-4 pb-2 text-center">
          <h1 className="truncate text-sm font-semibold text-slate-900">
            {document.template_name}
          </h1>
          <p className="truncate text-xs text-slate-500">
            {document.signer_name || "Recipient"} •{" "}
            {document.signer_email || "Secure session"}
          </p>
        </div>
      </header>

      <main className="w-full px-0 pb-16 pt-28 sm:pt-20 md:pt-20">
        {formError && (
          <div className="mx-auto w-full px-4 pb-4 lg:px-10">
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-destructive">
              {formError}
            </div>
          </div>
        )}
        <div
          ref={documentContainerRef}
          className="mx-auto w-full px-4 sm:px-6 lg:px-10"
        >
          <Document
            file={
              document.pdfData.startsWith("data:")
                ? document.pdfData
                : `data:application/pdf;base64,${document.pdfData.trim().replace(/\s/g, "")}`
            }
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(error) => {
              console.error("PDF load error:", error);
              setStatus("error");
              setStatusMessage(
                "Failed to load PDF. The document may be corrupted."
              );
            }}
            loading={
              <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            {numPages &&
              Array.from({ length: numPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <div
                    key={pageNum}
                    className="relative mx-auto mb-10 w-full"
                    style={{ width: pageWidth, maxWidth: "100%" }}
                  >
                    <Page
                      pageNumber={pageNum}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="h-auto w-full"
                    />
                    {document.placeholders
                      ?.filter((p) => p.page === pageNum)
                      .map((placeholder) => {
                        const value = getPlaceholderValue(placeholder);
                        const placeholderLabel =
                          placeholder.apiKey || placeholder.label || "Field";
                        const hasValue =
                          value !== undefined &&
                          value !== null &&
                          String(value).trim().length > 0;
                        const isSignatureField =
                          placeholder.type === "signature" ||
                          placeholder.type === "stamp" ||
                          placeholder.type === "initial";
                        const isCheckbox = placeholder.type === "checkbox";

                        const style = {
                          left: `${placeholder.x * 100}%`,
                          top: `${placeholder.y * 100}%`,
                          width: `${placeholder.width * 100}%`,
                          height:
                            isSignatureField || isCheckbox
                              ? `${placeholder.height * 100}%`
                              : undefined,
                        };

                        if (!isSignatureField && !isCheckbox) {
                          const textStyle = placeholder.textStyle || {};
                          // Mobile: reduce font size by 0.85em (15% smaller), Desktop: normal size
                          const baseFontSize = isMobile
                            ? Number(textStyle.fontSize) * 0.6
                            : Number(textStyle.fontSize) * 1.6 || 20;
                          // Use 0.85 multiplier for mobile to reduce by 15%
                          const fontSizeMultiplier = isMobile ? 0.85 : 1;
                          const computedFontSize =
                            baseFontSize * fontSizeMultiplier;
                          const color = textStyle.color || "#1f2937";
                          const fontWeight = textStyle.fontWeight || "500";
                          const letterSpacing =
                            textStyle.letterSpacing || "normal";
                          const verticalCenter =
                            (placeholder.y + placeholder.height / 2) * 100;

                          return (
                            <div
                              key={placeholder.id}
                              style={{
                                position: "absolute",
                                left: `${placeholder.x * 100}%`,
                                top: `${verticalCenter}%`,
                                width: `${placeholder.width * 100}%`,
                                transform: "translateY(-50%)",
                                color,
                                fontWeight,
                                fontSize: `${computedFontSize}px`,
                                letterSpacing,
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.2,
                              }}
                            >
                              {hasValue ? value : ""}
                            </div>
                          );
                        }

                        // Define signaturePreviewImage before using it
                        const signaturePreviewImage =
                          signatureImages[placeholder.id];

                        const classNames = [
                          "absolute",
                          "flex",
                          isSignatureField && signaturePreviewImage
                            ? "items-start" // Left-align for signature images
                            : "items-center", // Center for other fields
                          "gap-1 md:gap-2",
                          "border",
                          "border-dashed",
                          "border-primary/60",
                          "bg-primary/5",
                          "px-1.5 md:px-2",
                          "py-0.5 md:py-1",
                          "text-[0.65rem] md:text-xs",
                          "font-medium",
                        ];

                        let onClick;
                        let role;
                        let tabIndex;
                        let onKeyDown;

                        if (isSignatureField) {
                          classNames.push(
                            "cursor-pointer",
                            "hover:border-primary",
                            "hover:bg-primary/10"
                          );
                          onClick = () => openSignatureDialog(placeholder);
                          role = "button";
                          tabIndex = 0;
                          onKeyDown = (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openSignatureDialog(placeholder);
                            }
                          };
                        } else if (isCheckbox) {
                          classNames.push("justify-start", "cursor-pointer");
                          onClick = () => {
                            const fieldKey = resolveFieldKey(placeholder);
                            setFieldValues((prev) => ({
                              ...prev,
                              [fieldKey]: !prev[fieldKey],
                            }));
                          };
                          role = "button";
                          tabIndex = 0;
                          onKeyDown = (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              const fieldKey = resolveFieldKey(placeholder);
                              setFieldValues((prev) => ({
                                ...prev,
                                [fieldKey]: !prev[fieldKey],
                              }));
                            }
                          };
                        } else {
                          classNames.push("justify-between", "text-slate-700");
                        }

                        return (
                          <div
                            key={placeholder.id}
                            className={classNames.join(" ")}
                            style={style}
                            onClick={onClick}
                            role={role}
                            tabIndex={tabIndex}
                            onKeyDown={onKeyDown}
                          >
                            {isCheckbox ? (
                              <div className="flex items-center justify-center w-full h-full">
                                <span
                                  className={`inline-flex h-full w-full items-center justify-center border-2 rounded ${
                                    value
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-primary/60 text-transparent"
                                  } text-xs md:text-sm font-medium transition-colors`}
                                >
                                  {value ? (
                                    <svg
                                      className="w-3/4 h-3/4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  ) : (
                                    ""
                                  )}
                                </span>
                              </div>
                            ) : isSignatureField ? (
                              signaturePreviewImage ? (
                                <img
                                  src={signaturePreviewImage}
                                  alt="Signature preview"
                                  className="h-full w-auto"
                                  style={{
                                    objectFit: "contain",
                                    objectPosition: "left center",
                                  }}
                                  draggable={false}
                                  onMouseDown={(e) => {
                                    // Prevent opening dialog when clicking on image
                                    e.stopPropagation();
                                  }}
                                />
                              ) : hasValue ? (
                                <span className="text-xs md:text-sm text-slate-900">
                                  {value}
                                </span>
                              ) : (
                                <span className="text-[0.65rem] md:text-xs text-primary">
                                  Tap to sign
                                </span>
                              )
                            ) : (
                              <div className="flex w-full flex-col">
                                <span className="text-[0.6rem] md:text-[10px] uppercase tracking-wide text-primary/70">
                                  {placeholderLabel}
                                </span>
                                <span
                                  className={`text-xs md:text-sm font-medium ${
                                    hasValue
                                      ? "text-slate-900"
                                      : "text-muted-foreground italic"
                                  }`}
                                >
                                  {hasValue ? value : "Awaiting response"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )
              )}
          </Document>
        </div>
      </main>

      <Dialog
        open={signatureDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setSignatureDialogOpen(true);
          } else {
            closeSignatureDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg border border-border bg-white text-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              Place Your Signature
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Choose a signature style: type your name, draw your signature, or
              upload an image.
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={signatureModalTab}
            onValueChange={(value) => {
              setSignatureModalTab(value);
              if (value === "text") {
                setSignatureType("text");
                setImagePreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
                if (activeSignaturePlaceholder) {
                  setSignatureForPlaceholder(
                    activeSignaturePlaceholder,
                    "text",
                    signatureText,
                    { fontId: selectedSignatureFont }
                  );
                }
              } else if (value === "draw") {
                setSignatureType("draw");
                setImagePreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              } else {
                setSignatureType("image");
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="text"
                className="text-[0.7rem] md:text-xs lg:text-sm"
              >
                <Type className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                Text
              </TabsTrigger>
              <TabsTrigger
                value="draw"
                className="text-[0.7rem] md:text-xs lg:text-sm"
              >
                <PenTool className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                Draw
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="text-[0.7rem] md:text-xs lg:text-sm"
              >
                <ImageIcon className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                Upload
              </TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signature-name" className="text-xs md:text-sm">
                  Your name
                </Label>
                <Input
                  id="signature-name"
                  value={signatureText}
                  onChange={(e) => handleSignatureNameChange(e.target.value)}
                  placeholder="Enter your full name"
                  autoFocus
                  className="text-xs md:text-sm"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[0.65rem] md:text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Available styles
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {signatureFontOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSignatureFontSelect(option.id)}
                      className={`rounded-md border px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-lg transition ${
                        selectedSignatureFont === option.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:border-primary/60"
                      } ${option.className}`}
                    >
                      {signatureSampleName}
                    </button>
                  ))}
                </div>
                <p className="text-[0.65rem] md:text-xs text-muted-foreground">
                  We'll automatically update the document as you type or change
                  the style.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="draw" className="space-y-4 pt-4">
              <div className="space-y-3">
                <Label className="text-xs md:text-sm">
                  Draw your signature
                </Label>
                <div className="relative border-2 border-dashed border-border rounded-lg bg-white">
                  <canvas
                    ref={canvasRef}
                    className="w-full cursor-crosshair touch-none"
                    style={{ height: "200px" }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="text-xs md:text-sm"
                    onClick={clearCanvas}
                  >
                    Clear
                  </Button>
                </div>
                <p className="text-[0.65rem] md:text-xs text-muted-foreground">
                  Use your mouse or touch screen to draw your signature. It will
                  be automatically saved when you close this dialog.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="image" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label
                  htmlFor="signature-upload"
                  className="text-xs md:text-sm"
                >
                  Upload signature image
                </Label>
                <Input
                  id="signature-upload"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleSignatureFileChange}
                  className="text-xs md:text-sm"
                />
                <p className="text-[0.65rem] md:text-xs text-muted-foreground">
                  Accepted formats: PNG or JPG. Max size 2MB.
                </p>
              </div>

              {imagePreview || activeSignatureImage ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs md:text-sm">
                      Signature Preview
                    </Label>
                    <div className="mt-2 rounded-md border border-border/50 bg-white p-3 md:p-4 flex items-center justify-center">
                      <img
                        src={imagePreview || activeSignatureImage}
                        alt="Signature preview"
                        className="max-h-36 md:max-h-48 max-w-full object-contain"
                      />
                    </div>
                    <p className="mt-2 text-[0.65rem] md:text-xs text-muted-foreground">
                      Your signature will be automatically resized to fit the
                      field
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="text-xs md:text-sm"
                      onClick={() => {
                        setImagePreview(null);
                        if (activeSignaturePlaceholder) {
                          setSignatureForPlaceholder(
                            activeSignaturePlaceholder,
                            "image",
                            null
                          );
                        }
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      Remove Image
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="text-xs md:text-sm"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.click();
                        }
                      }}
                    >
                      Change Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Upload an image of your signature. It will be automatically
                    resized to fit the signature field.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-xs md:text-sm"
              onClick={() => {
                if (activeSignaturePlaceholder) {
                  setSignatureForPlaceholder(
                    activeSignaturePlaceholder,
                    "image",
                    null
                  );
                }
                setImagePreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Clear signature
            </Button>
            <Button
              type="button"
              className="text-xs md:text-sm"
              onClick={closeSignatureDialog}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Error Dialog */}
      <Dialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
      >
        <DialogContent className="sm:max-w-md border border-border bg-white text-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-500" />
              Incomplete Form
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm text-muted-foreground whitespace-pre-line">
              {validationMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="text-xs md:text-sm"
              onClick={() => setValidationDialogOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SigningPage;
