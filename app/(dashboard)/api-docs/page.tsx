"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Documentation"
        description="Interactive API reference powered by OpenAPI"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "API Docs" },
        ]}
      />

      {/* Dark theme overrides for swagger-ui */}
      <style jsx global>{`
        .swagger-ui {
          font-family: inherit;
        }
        .swagger-ui,
        .swagger-ui .wrapper {
          background: transparent;
        }
        .swagger-ui .scheme-container {
          background: rgb(17 24 39);
          border: 1px solid rgb(31 41 55);
          border-radius: 0.5rem;
          padding: 1rem;
          box-shadow: none;
        }
        .swagger-ui .opblock-tag {
          color: rgb(243 244 246) !important;
          border-bottom-color: rgb(31 41 55) !important;
        }
        .swagger-ui .opblock-tag:hover {
          background: rgb(17 24 39) !important;
        }
        .swagger-ui .opblock-tag small {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .opblock {
          border-color: rgb(31 41 55) !important;
          border-radius: 0.5rem !important;
          background: rgb(17 24 39) !important;
          box-shadow: none !important;
        }
        .swagger-ui .opblock .opblock-summary {
          border-bottom-color: rgb(31 41 55) !important;
        }
        .swagger-ui .opblock .opblock-summary-method {
          border-radius: 0.375rem !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          padding: 4px 12px !important;
        }
        .swagger-ui .opblock .opblock-summary-path,
        .swagger-ui .opblock .opblock-summary-path__deprecated {
          color: rgb(209 213 219) !important;
        }
        .swagger-ui .opblock .opblock-summary-description {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .opblock.opblock-get {
          background: rgba(59 130 246 / 0.05) !important;
          border-color: rgba(59 130 246 / 0.2) !important;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: rgb(37 99 235) !important;
        }
        .swagger-ui .opblock.opblock-post {
          background: rgba(34 197 94 / 0.05) !important;
          border-color: rgba(34 197 94 / 0.2) !important;
        }
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: rgb(22 163 74) !important;
        }
        .swagger-ui .opblock.opblock-put {
          background: rgba(245 158 11 / 0.05) !important;
          border-color: rgba(245 158 11 / 0.2) !important;
        }
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: rgb(217 119 6) !important;
        }
        .swagger-ui .opblock.opblock-delete {
          background: rgba(239 68 68 / 0.05) !important;
          border-color: rgba(239 68 68 / 0.2) !important;
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: rgb(220 38 38) !important;
        }
        .swagger-ui .opblock-body {
          background: rgb(17 24 39) !important;
        }
        .swagger-ui .opblock-body pre,
        .swagger-ui .opblock-body pre.microlight {
          background: rgb(3 7 18) !important;
          color: rgb(209 213 219) !important;
          border: 1px solid rgb(31 41 55) !important;
          border-radius: 0.375rem !important;
          padding: 0.75rem !important;
          font-size: 0.75rem !important;
        }
        .swagger-ui .opblock-section-header {
          background: rgb(17 24 39) !important;
          border-bottom-color: rgb(31 41 55) !important;
        }
        .swagger-ui .opblock-section-header h4 {
          color: rgb(209 213 219) !important;
        }
        .swagger-ui table thead tr td,
        .swagger-ui table thead tr th {
          color: rgb(156 163 175) !important;
          border-bottom-color: rgb(31 41 55) !important;
        }
        .swagger-ui .parameter__name {
          color: rgb(209 213 219) !important;
        }
        .swagger-ui .parameter__name.required::after {
          color: rgb(239 68 68) !important;
        }
        .swagger-ui .parameter__type {
          color: rgb(96 165 250) !important;
        }
        .swagger-ui .parameter__in {
          color: rgb(107 114 128) !important;
        }
        .swagger-ui .parameters-col_description p,
        .swagger-ui .parameters-col_description textarea {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui input[type="text"],
        .swagger-ui textarea,
        .swagger-ui select {
          background: rgb(3 7 18) !important;
          color: rgb(209 213 219) !important;
          border-color: rgb(55 65 81) !important;
          border-radius: 0.375rem !important;
        }
        .swagger-ui input[type="text"]:focus,
        .swagger-ui textarea:focus,
        .swagger-ui select:focus {
          border-color: rgb(59 130 246) !important;
          outline: none !important;
        }
        .swagger-ui .btn {
          border-radius: 0.375rem !important;
          font-size: 0.75rem !important;
        }
        .swagger-ui .btn.execute {
          background: rgb(37 99 235) !important;
          border-color: rgb(37 99 235) !important;
          color: white !important;
        }
        .swagger-ui .btn.cancel {
          background: rgb(55 65 81) !important;
          border-color: rgb(55 65 81) !important;
          color: rgb(209 213 219) !important;
        }
        .swagger-ui .model-box,
        .swagger-ui section.models {
          background: rgb(17 24 39) !important;
          border-color: rgb(31 41 55) !important;
          border-radius: 0.5rem !important;
        }
        .swagger-ui section.models h4 {
          color: rgb(209 213 219) !important;
          border-bottom-color: rgb(31 41 55) !important;
        }
        .swagger-ui .model {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .model-title {
          color: rgb(209 213 219) !important;
        }
        .swagger-ui .prop-type {
          color: rgb(96 165 250) !important;
        }
        .swagger-ui .prop-format {
          color: rgb(107 114 128) !important;
        }
        .swagger-ui .model .property.primitive {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .response-col_status {
          color: rgb(209 213 219) !important;
        }
        .swagger-ui .response-col_description {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .responses-inner h4,
        .swagger-ui .responses-inner h5 {
          color: rgb(209 213 219) !important;
        }
        .swagger-ui .info {
          margin: 0 !important;
        }
        .swagger-ui .info .title {
          color: rgb(243 244 246) !important;
        }
        .swagger-ui .info .base-url {
          color: rgb(107 114 128) !important;
        }
        .swagger-ui .info .description p {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .info a {
          color: rgb(96 165 250) !important;
        }
        .swagger-ui .info li,
        .swagger-ui .info p,
        .swagger-ui .info table {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .loading-container {
          display: none !important;
        }
        .swagger-ui .servers > label {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .servers > label select {
          background: rgb(3 7 18) !important;
          color: rgb(209 213 219) !important;
          border-color: rgb(55 65 81) !important;
        }
        .swagger-ui .topbar {
          display: none !important;
        }
        .swagger-ui .arrow {
          fill: rgb(156 163 175) !important;
        }
        .swagger-ui svg.arrow {
          fill: rgb(156 163 175) !important;
        }
        .swagger-ui .expand-operation svg {
          fill: rgb(156 163 175) !important;
        }
        .swagger-ui .response-control-media-type__accept-message {
          color: rgb(34 197 94) !important;
        }
        .swagger-ui .copy-to-clipboard {
          bottom: 5px !important;
          right: 5px !important;
        }
        .swagger-ui .copy-to-clipboard button {
          background: rgb(55 65 81) !important;
          border: none !important;
          border-radius: 0.25rem !important;
        }
        .swagger-ui .microlight {
          background: rgb(3 7 18) !important;
          color: rgb(209 213 219) !important;
        }
        .swagger-ui .markdown p,
        .swagger-ui .markdown pre,
        .swagger-ui .renderedMarkdown p,
        .swagger-ui .renderedMarkdown pre {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .tab li {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .tab li.active {
          color: rgb(243 244 246) !important;
        }
        .swagger-ui .opblock-description-wrapper p {
          color: rgb(156 163 175) !important;
        }
        .swagger-ui .dialog-ux .modal-ux {
          background: rgb(17 24 39) !important;
          border-color: rgb(31 41 55) !important;
        }
        .swagger-ui .dialog-ux .modal-ux-header h3 {
          color: rgb(209 213 219) !important;
        }
        .swagger-ui .response-col_links {
          color: rgb(96 165 250) !important;
        }
      `}</style>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 min-h-[600px]">
        {!mounted ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <SwaggerUI url="/api/openapi" />
        )}
      </div>
    </div>
  );
}
