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
        iframe.style.width = '100%';
        iframe.style.height = height ? (typeof height === 'number' ? `${height}px` : height) : '100%';
        iframe.style.minHeight = '60px';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.style.display = 'block';
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameborder', '0');

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
                            html, body {
                                margin: 0;
                                padding: 0;
                                width: 100%;
                                height: 100%;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                background: transparent;
                                overflow: hidden;
                            }
                            img, iframe, svg, div, a {
                                max-width: 100%;
                            }
                        </style>
                    </head>
                    <body>
                        ${html}
                    </body>
                    </html>
                `);
                doc.close();

                // Auto adjust iframe height based on content height
                const adjustHeight = () => {
                    try {
                        const body = doc.body;
                        if (body && body.scrollHeight > 0) {
                            const h = Math.max(body.scrollHeight, body.offsetHeight, 60);
                            iframe.style.height = `${h}px`;
                        }
                    } catch (e) {
                        // ignore cross-origin restrictions if ad redirects
                    }
                };

                setTimeout(adjustHeight, 300);
                setTimeout(adjustHeight, 1000);
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
