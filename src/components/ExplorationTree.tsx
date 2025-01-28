'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ExplorationNode } from '@/types';
import { HierarchyNode, HierarchyLink } from 'd3';

interface ExplorationTreeProps {
  data: ExplorationNode;
}

type D3Node = HierarchyNode<ExplorationNode>;
type D3Link = HierarchyLink<ExplorationNode>;

export default function ExplorationTree({ data }: ExplorationTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = { top: 40, right: 20, bottom: 40, left: 40 };

    // Create tree layout - swap width and height for vertical orientation
    const tree = d3.tree<ExplorationNode>()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .separation((a: D3Node, b: D3Node) => (a.parent === b.parent ? 1 : 1.5));

    // Create hierarchy from data
    const root = d3.hierarchy(data);
    const treeData = tree(root);

    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create links with vertical path
    g.selectAll('.link')
      .data(treeData.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1.5)
      .attr('d', d3.linkVertical<D3Link, D3Link>()
        .x((d: any) => d.x)
        .y((d: any) => d.y)
      );

    // Create nodes with adjusted positioning
    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`);

    // Add circles to nodes
    nodes.append('circle')
      .attr('r', 6)
      .attr('fill', (d: D3Node) => d.data.depth === 0 ? '#4299e1' : '#9ae6b4')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes with adjusted positioning
    nodes.append('text')
      .attr('dy', '1.5em')  // Position text below node
      .attr('x', 0)         // Center text horizontally
      .attr('text-anchor', 'middle')  // Center text alignment
      .text((d: D3Node) => d.data.title)
      .clone(true)
      .lower()
      .attr('stroke', 'white')
      .attr('stroke-width', 3);

  }, [data]);

  return (
    <div className="w-full h-full">
      <svg 
        ref={svgRef} 
        className="w-full h-full"
        style={{ minHeight: '600px' }}  // Increased height for better vertical display
      />
    </div>
  );
} 