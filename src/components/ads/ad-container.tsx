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
}

export function AdContainer({ html, className = '' }: AdContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && html) {
            executeAdScript(containerRef.current, html);
        }
    }, [html]);

    return <div ref={containerRef} className={className} />;
}
