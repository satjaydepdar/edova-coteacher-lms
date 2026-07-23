#!/usr/bin/env python3
"""
NCERT RAG System - Main Entry Point
Usage:
    python main.py ingest --pdf-dir ./data/pdfs
    python main.py ingest-okf --bundle-dir ./data/okf
    python main.py query "What is the quadratic formula?"
    python main.py chat
    python main.py stats
    python main.py clear
    python main.py watch --brain-root ../edova-brain
"""

import argparse
import sys
from pathlib import Path
from ingestion.pipeline import IngestionPipeline
from query.engine import QueryEngine
from storage.pgvector_store import PGVectorStore
from utils.pdf_utils import PDFUtils


def ingest_command(args):
    """Ingest PDFs into the vector database"""
    pipeline = IngestionPipeline()
    
    # Get PDF files
    pdf_dir = Path(args.pdf_dir)
    if not pdf_dir.exists():
        print(f"Error: Directory not found: {pdf_dir}")
        sys.exit(1)
    
    pdf_files = PDFUtils.get_pdf_files(str(pdf_dir))
    
    if not pdf_files:
        print(f"No PDF files found in {pdf_dir}")
        sys.exit(1)
    
    print(f"Found {len(pdf_files)} PDF files:")
    for f in pdf_files:
        print(f"  - {f.name}")
    
    # Process
    results = pipeline.process_and_store(
        [str(f) for f in pdf_files],
        use_vision=not args.text_only,
        chunk_size=args.chunk_size
    )
    
    print(f"\nResults:")
    print(f"  Processed: {results['processed']}")
    print(f"  Failed: {results['failed']}")
    if results['errors']:
        print(f"  Errors: {len(results['errors'])}")
        for e in results['errors'][:5]:
            print(f"    - {e}")


def ingest_okf_command(args):
    """Ingest an Open Knowledge Format bundle into the vector database"""
    pipeline = IngestionPipeline()

    bundle_dir = Path(args.bundle_dir)
    if not bundle_dir.exists():
        print(f"Error: OKF bundle directory not found: {bundle_dir}")
        sys.exit(1)

    results = pipeline.process_okf_bundle(
        str(bundle_dir),
        chunk_size=args.chunk_size,
        resolve_resources=not args.no_resolve_resources,
    )

    print(f"\nResults:")
    print(f"  Processed: {results['processed']}")
    print(f"  Failed: {results['failed']}")
    if results['errors']:
        print(f"  Errors: {len(results['errors'])}")
        for e in results['errors'][:5]:
            print(f"    - {e}")


def query_command(args):
    """Query the vector database"""
    engine = QueryEngine()
    result = engine.query(args.question, top_k=args.top_k)
    
    print(f"\n{'=' * 70}")
    print("ANSWER")
    print(f"{'=' * 70}")
    print(result['answer'])
    print(f"\n{'=' * 70}")
    print("SOURCES")
    print(f"{'=' * 70}")
    for src in result['sources']:
        print(f"  📄 {src['doc_id']} | Page {src['page']} | Similarity: {src['similarity']:.3f}")


def chat_command(args):
    """Interactive chat mode"""
    engine = QueryEngine()
    history = []
    
    print("\n" + "=" * 70)
    print("NCERT MATH TUTOR - Interactive Chat")
    print("Type 'quit' or 'exit' to end")
    print("=" * 70)
    
    while True:
        user_input = input("\nYou: ").strip()
        
        if user_input.lower() in ('quit', 'exit', 'q'):
            print("Goodbye!")
            break
        
        if not user_input:
            continue
        
        result = engine.chat(user_input, history)
        
        print(f"\nTutor: {result['response']}")
        
        # Update history
        history.append({"user": user_input, "assistant": result['response']})
        if len(history) > 10:  # Keep last 10 exchanges
            history = history[-10:]


def watch_command(args):
    """Watch edova-brain/ for new documents and auto-convert them into OKF concepts"""
    from watcher.file_watcher import watch
    from watcher.pipeline import process_document

    brain_root = Path(args.brain_root).resolve()
    okf_root = brain_root / "OKF"
    if not brain_root.exists():
        print(f"Error: brain root not found: {brain_root}")
        sys.exit(1)

    def on_new_document(path, kind):
        process_document(path, brain_root, okf_root)

    observer = watch(str(brain_root), on_new_document)
    print("Press Ctrl+C to stop.")
    try:
        observer.join()
    except KeyboardInterrupt:
        observer.stop()
        observer.join()
        print("\n[watcher] stopped.")


def stats_command(args):
    """Show database statistics"""
    store = PGVectorStore()
    count = store.get_document_count()
    
    print(f"\n{'=' * 70}")
    print("DATABASE STATISTICS")
    print(f"{'=' * 70}")
    print(f"Total documents in vector store: {count}")
    print(f"Database URL: {'*' * 10} (hidden)")


def clear_command(args):
    """Clear the database"""
    store = PGVectorStore()
    
    confirm = input("Are you sure you want to clear all documents? (yes/no): ")
    if confirm.lower() == 'yes':
        store.clear_collection()
        print("Database cleared.")
    else:
        print("Operation cancelled.")


def main():
    parser = argparse.ArgumentParser(
        description="NCERT RAG System - Extract, Embed, Query",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Ingest all PDFs from a directory
  python main.py ingest --pdf-dir ./data/pdfs
  
  # Use text extraction instead of vision
  python main.py ingest --pdf-dir ./data/pdfs --text-only
  
  # Query the database
  python main.py query "What is the quadratic formula?"
  
  # Interactive chat
  python main.py chat
  
  # Show stats
  python main.py stats
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Ingest command
    ingest_parser = subparsers.add_parser('ingest', help='Ingest PDFs into database')
    ingest_parser.add_argument('--pdf-dir', default='./data/pdfs', help='Directory containing PDFs')
    ingest_parser.add_argument('--text-only', action='store_true', help='Use text extraction instead of vision API')
    ingest_parser.add_argument('--chunk-size', type=int, default=512, help='Text chunk size')
    ingest_parser.set_defaults(func=ingest_command)

    # Ingest OKF bundle command
    ingest_okf_parser = subparsers.add_parser('ingest-okf', help='Ingest an Open Knowledge Format bundle into database')
    ingest_okf_parser.add_argument('--bundle-dir', default='../edova-brain/OKF/math-Knowledge', help='Directory containing the OKF bundle')
    ingest_okf_parser.add_argument('--chunk-size', type=int, default=512, help='Text chunk size')
    ingest_okf_parser.add_argument('--no-resolve-resources', action='store_true',
                                    help="Don't follow resource: links into a sibling content workspace — ingest OKF concept bodies as-is")
    ingest_okf_parser.set_defaults(func=ingest_okf_command)

    # Query command
    query_parser = subparsers.add_parser('query', help='Query the database')
    query_parser.add_argument('question', help='Your question')
    query_parser.add_argument('--top-k', type=int, default=5, help='Number of results to retrieve')
    query_parser.set_defaults(func=query_command)
    
    # Chat command
    chat_parser = subparsers.add_parser('chat', help='Interactive chat mode')
    chat_parser.set_defaults(func=chat_command)
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show database statistics')
    stats_parser.set_defaults(func=stats_command)
    
    # Clear command
    clear_parser = subparsers.add_parser('clear', help='Clear the database')
    clear_parser.set_defaults(func=clear_command)

    # Watch command
    watch_parser = subparsers.add_parser(
        'watch', help='Watch edova-brain/ for new documents and auto-convert them into OKF concepts'
    )
    watch_parser.add_argument('--brain-root', default='../edova-brain', help='Directory to watch recursively')
    watch_parser.set_defaults(func=watch_command)

    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == '__main__':
    main()