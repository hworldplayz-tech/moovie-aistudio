'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Safely executes raw HTML containing <script> tags inside a container.
 * Browsers do not execute <script> tags when set via innerHTML or dangerouslySetInnerHTML.
 * This helper parses the HTML, recreates script elements as executable script nodes,
 * and appends them to the DOM in proper order.
 */
export function executeAdScript(container: HTMLElement, rawHtml: string) {
    if (!container || !rawHtml) return;

    // Clear previous contents
    container.innerHTML = '';

    // Create a temporary container to parse raw HTML
    const temp = document.createElement('div');
    temp.innerHTML = rawHtml;

    // Find all <script> nodes
    const scripts = Array.from(temp.querySelectorAll('script'));

    // Replace non-executable script tags in temp with newly created executable script elements
    scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');

        // Copy all attributes (src, type, async, defer, data-cfasync, crossOrigin, etc.)
        Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
        });

        // Copy inline script text if present
        if (oldScript.innerHTML) {
            newScript.textContent = oldScript.innerHTML;
        }

        // Replace old script with new script in temp tree
        if (oldScript.parentNode) {
            oldScript.parentNode.replaceChild(newScript, oldScript);
        }
    });

    // Move all elements from temp to target container
    while (temp.firstChild) {
        container.appendChild(temp.firstChild);
    }
}

interface AdContainerProps {
    html: string;
    className?: string;
    height?: number | string;
}

export function AdContainer({ html, className = '', height }: AdContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !html) return;

        const container = containerRef.current;
        container.innerHTML = '';

        // Render ad inside an isolated iframe so document.write calls (common in ad networks like Adsterra/Monetag)
        // execute cleanly during parser stream without being blocked by SPA async execution rules.
        const iframe = document.createElement('iframe');
        iframe.setAttribute('allowtransparency', 'true');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameborder', '0');
        iframe.style.width = '100%';
        iframe.style.height = height ? (typeof height === 'number' ? `${height}px` : height) : '0px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.style.display = 'block';
        iframe.style.backgroundColor = 'transparent';

        container.appendChild(iframe);

        try {
            const doc = iframe.contentWindow?.document || iframe.contentDocument;
            if (doc) {
                doc.open();
                doc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            * {
                                box-sizing: border-box;
                            }
                            html {
                                background: transparent !important;
                                margin: 0;
                                padding: 0;
                                overflow: hidden;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                                background: transparent !important;
                                color: inherit;
                                overflow: hidden;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                width: 100%;
                            }
                            img, iframe, svg, div, a {
                                max-width: 100%;
                            }
                        </style>
                    </head>
                    <body allowtransparency="true">
                        ${html}
                    </body>
                    </html>
                `);
                doc.close();

                // Auto adjust iframe height based on content height
                const adjustHeight = () => {
                    try {
                        const body = doc.body;
                        if (!body) return;

                        let measuredHeight = 0;

                        // Check direct element children in body
                        const children = Array.from(body.children);
                        for (const child of children) {
                            if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;
                            const el = child as HTMLElement;
                            const rect = el.getBoundingClientRect();
                            const h = Math.max(el.offsetHeight || 0, el.scrollHeight || 0, Math.ceil(rect.height) || 0);
                            if (h > measuredHeight) measuredHeight = h;
                        }

                        if (!measuredHeight || measuredHeight < 10) {
                            measuredHeight = Math.max(body.scrollHeight || 0, body.offsetHeight || 0);
                        }

                        if (measuredHeight > 0) {
                            iframe.style.height = `${measuredHeight}px`;
                        }
                    } catch (e) {
                        // ignore cross-origin restrictions if ad redirects
                    }
                };

                iframe.onload = adjustHeight;
                setTimeout(adjustHeight, 50);
                setTimeout(adjustHeight, 200);
                setTimeout(adjustHeight, 600);
                setTimeout(adjustHeight, 1200);
                setTimeout(adjustHeight, 2500);
            }
        } catch (err) {
            console.error('Error rendering ad iframe:', err);
            // Fallback to direct script execution if iframe fails
            executeAdScript(container, html);
        }
    }, [html, height]);

    return <div ref={containerRef} className={className} />;
}
