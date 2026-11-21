// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reading_progress.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetReadingProgressCollection on Isar {
  IsarCollection<ReadingProgress> get readingProgress => this.collection();
}

const ReadingProgressSchema = CollectionSchema(
  name: r'ReadingProgress',
  id: -2251063111460261641,
  properties: {
    r'bookId': PropertySchema(
      id: 0,
      name: r'bookId',
      type: IsarType.string,
    ),
    r'canProceedToNextSection': PropertySchema(
      id: 1,
      name: r'canProceedToNextSection',
      type: IsarType.bool,
    ),
    r'createdAt': PropertySchema(
      id: 2,
      name: r'createdAt',
      type: IsarType.dateTime,
    ),
    r'currentPage': PropertySchema(
      id: 3,
      name: r'currentPage',
      type: IsarType.long,
    ),
    r'progressId': PropertySchema(
      id: 4,
      name: r'progressId',
      type: IsarType.string,
    ),
    r'sectionCompletedAt': PropertySchema(
      id: 5,
      name: r'sectionCompletedAt',
      type: IsarType.dateTime,
    ),
    r'sectionSize': PropertySchema(
      id: 6,
      name: r'sectionSize',
      type: IsarType.long,
    ),
    r'sectionStartedAt': PropertySchema(
      id: 7,
      name: r'sectionStartedAt',
      type: IsarType.dateTime,
    ),
    r'sectionType': PropertySchema(
      id: 8,
      name: r'sectionType',
      type: IsarType.byte,
      enumMap: _ReadingProgresssectionTypeEnumValueMap,
    ),
    r'totalPages': PropertySchema(
      id: 9,
      name: r'totalPages',
      type: IsarType.long,
    ),
    r'totalWordsInSection': PropertySchema(
      id: 10,
      name: r'totalWordsInSection',
      type: IsarType.long,
    ),
    r'updatedAt': PropertySchema(
      id: 11,
      name: r'updatedAt',
      type: IsarType.dateTime,
    ),
    r'userId': PropertySchema(
      id: 12,
      name: r'userId',
      type: IsarType.string,
    ),
    r'vocabularyThreshold': PropertySchema(
      id: 13,
      name: r'vocabularyThreshold',
      type: IsarType.double,
    ),
    r'wordsLearned': PropertySchema(
      id: 14,
      name: r'wordsLearned',
      type: IsarType.long,
    )
  },
  estimateSize: _readingProgressEstimateSize,
  serialize: _readingProgressSerialize,
  deserialize: _readingProgressDeserialize,
  deserializeProp: _readingProgressDeserializeProp,
  idName: r'id',
  indexes: {
    r'progressId': IndexSchema(
      id: 4748525131218572301,
      name: r'progressId',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'progressId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    ),
    r'bookId': IndexSchema(
      id: 3567540928881766442,
      name: r'bookId',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'bookId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _readingProgressGetId,
  getLinks: _readingProgressGetLinks,
  attach: _readingProgressAttach,
  version: '3.1.0+1',
);

int _readingProgressEstimateSize(
  ReadingProgress object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.bookId.length * 3;
  bytesCount += 3 + object.progressId.length * 3;
  {
    final value = object.userId;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  return bytesCount;
}

void _readingProgressSerialize(
  ReadingProgress object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.bookId);
  writer.writeBool(offsets[1], object.canProceedToNextSection);
  writer.writeDateTime(offsets[2], object.createdAt);
  writer.writeLong(offsets[3], object.currentPage);
  writer.writeString(offsets[4], object.progressId);
  writer.writeDateTime(offsets[5], object.sectionCompletedAt);
  writer.writeLong(offsets[6], object.sectionSize);
  writer.writeDateTime(offsets[7], object.sectionStartedAt);
  writer.writeByte(offsets[8], object.sectionType.index);
  writer.writeLong(offsets[9], object.totalPages);
  writer.writeLong(offsets[10], object.totalWordsInSection);
  writer.writeDateTime(offsets[11], object.updatedAt);
  writer.writeString(offsets[12], object.userId);
  writer.writeDouble(offsets[13], object.vocabularyThreshold);
  writer.writeLong(offsets[14], object.wordsLearned);
}

ReadingProgress _readingProgressDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = ReadingProgress();
  object.bookId = reader.readString(offsets[0]);
  object.canProceedToNextSection = reader.readBool(offsets[1]);
  object.createdAt = reader.readDateTime(offsets[2]);
  object.currentPage = reader.readLong(offsets[3]);
  object.id = id;
  object.progressId = reader.readString(offsets[4]);
  object.sectionCompletedAt = reader.readDateTimeOrNull(offsets[5]);
  object.sectionSize = reader.readLong(offsets[6]);
  object.sectionStartedAt = reader.readDateTimeOrNull(offsets[7]);
  object.sectionType = _ReadingProgresssectionTypeValueEnumMap[
          reader.readByteOrNull(offsets[8])] ??
      SectionType.pages;
  object.totalPages = reader.readLong(offsets[9]);
  object.totalWordsInSection = reader.readLong(offsets[10]);
  object.updatedAt = reader.readDateTime(offsets[11]);
  object.userId = reader.readStringOrNull(offsets[12]);
  object.vocabularyThreshold = reader.readDouble(offsets[13]);
  object.wordsLearned = reader.readLong(offsets[14]);
  return object;
}

P _readingProgressDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readString(offset)) as P;
    case 1:
      return (reader.readBool(offset)) as P;
    case 2:
      return (reader.readDateTime(offset)) as P;
    case 3:
      return (reader.readLong(offset)) as P;
    case 4:
      return (reader.readString(offset)) as P;
    case 5:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 6:
      return (reader.readLong(offset)) as P;
    case 7:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 8:
      return (_ReadingProgresssectionTypeValueEnumMap[
              reader.readByteOrNull(offset)] ??
          SectionType.pages) as P;
    case 9:
      return (reader.readLong(offset)) as P;
    case 10:
      return (reader.readLong(offset)) as P;
    case 11:
      return (reader.readDateTime(offset)) as P;
    case 12:
      return (reader.readStringOrNull(offset)) as P;
    case 13:
      return (reader.readDouble(offset)) as P;
    case 14:
      return (reader.readLong(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

const _ReadingProgresssectionTypeEnumValueMap = {
  'pages': 0,
  'chapters': 1,
};
const _ReadingProgresssectionTypeValueEnumMap = {
  0: SectionType.pages,
  1: SectionType.chapters,
};

Id _readingProgressGetId(ReadingProgress object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _readingProgressGetLinks(ReadingProgress object) {
  return [];
}

void _readingProgressAttach(
    IsarCollection<dynamic> col, Id id, ReadingProgress object) {
  object.id = id;
}

extension ReadingProgressQueryWhereSort
    on QueryBuilder<ReadingProgress, ReadingProgress, QWhere> {
  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension ReadingProgressQueryWhere
    on QueryBuilder<ReadingProgress, ReadingProgress, QWhereClause> {
  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause> idEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause>
      idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause> idLessThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause>
      progressIdEqualTo(String progressId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'progressId',
        value: [progressId],
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause>
      progressIdNotEqualTo(String progressId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'progressId',
              lower: [],
              upper: [progressId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'progressId',
              lower: [progressId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'progressId',
              lower: [progressId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'progressId',
              lower: [],
              upper: [progressId],
              includeUpper: false,
            ));
      }
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause>
      bookIdEqualTo(String bookId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'bookId',
        value: [bookId],
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterWhereClause>
      bookIdNotEqualTo(String bookId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [],
              upper: [bookId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [bookId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [bookId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [],
              upper: [bookId],
              includeUpper: false,
            ));
      }
    });
  }
}

extension ReadingProgressQueryFilter
    on QueryBuilder<ReadingProgress, ReadingProgress, QFilterCondition> {
  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'bookId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'bookId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'bookId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      bookIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'bookId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      canProceedToNextSectionEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'canProceedToNextSection',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      createdAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      createdAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      createdAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      createdAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'createdAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      currentPageEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'currentPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      currentPageGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'currentPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      currentPageLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'currentPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      currentPageBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'currentPage',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'progressId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'progressId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'progressId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'progressId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'progressId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'progressId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'progressId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'progressId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'progressId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      progressIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'progressId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionCompletedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'sectionCompletedAt',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionCompletedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'sectionCompletedAt',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionCompletedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'sectionCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionCompletedAtGreaterThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'sectionCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionCompletedAtLessThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'sectionCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionCompletedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'sectionCompletedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionSizeEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'sectionSize',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionSizeGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'sectionSize',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionSizeLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'sectionSize',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionSizeBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'sectionSize',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionStartedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'sectionStartedAt',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionStartedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'sectionStartedAt',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionStartedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'sectionStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionStartedAtGreaterThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'sectionStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionStartedAtLessThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'sectionStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionStartedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'sectionStartedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionTypeEqualTo(SectionType value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'sectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionTypeGreaterThan(
    SectionType value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'sectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionTypeLessThan(
    SectionType value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'sectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      sectionTypeBetween(
    SectionType lower,
    SectionType upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'sectionType',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      totalPagesEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'totalPages',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      totalPagesGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'totalPages',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      totalPagesLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'totalPages',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      totalPagesBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'totalPages',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      totalWordsInSectionEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'totalWordsInSection',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      totalWordsInSectionGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'totalWordsInSection',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      totalWordsInSectionLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'totalWordsInSection',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      totalWordsInSectionBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'totalWordsInSection',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      updatedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      updatedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      updatedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      updatedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'updatedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'userId',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'userId',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'userId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'userId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      userIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'userId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      vocabularyThresholdEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'vocabularyThreshold',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      vocabularyThresholdGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'vocabularyThreshold',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      vocabularyThresholdLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'vocabularyThreshold',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      vocabularyThresholdBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'vocabularyThreshold',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      wordsLearnedEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'wordsLearned',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      wordsLearnedGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'wordsLearned',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      wordsLearnedLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'wordsLearned',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterFilterCondition>
      wordsLearnedBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'wordsLearned',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension ReadingProgressQueryObject
    on QueryBuilder<ReadingProgress, ReadingProgress, QFilterCondition> {}

extension ReadingProgressQueryLinks
    on QueryBuilder<ReadingProgress, ReadingProgress, QFilterCondition> {}

extension ReadingProgressQuerySortBy
    on QueryBuilder<ReadingProgress, ReadingProgress, QSortBy> {
  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy> sortByBookId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByBookIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByCanProceedToNextSection() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'canProceedToNextSection', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByCanProceedToNextSectionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'canProceedToNextSection', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByCurrentPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'currentPage', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByCurrentPageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'currentPage', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByProgressId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'progressId', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByProgressIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'progressId', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortBySectionCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionCompletedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortBySectionCompletedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionCompletedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortBySectionSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionSize', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortBySectionSizeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionSize', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortBySectionStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionStartedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortBySectionStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionStartedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortBySectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionType', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortBySectionTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionType', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByTotalPages() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPages', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByTotalPagesDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPages', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByTotalWordsInSection() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWordsInSection', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByTotalWordsInSectionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWordsInSection', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy> sortByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByVocabularyThreshold() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'vocabularyThreshold', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByVocabularyThresholdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'vocabularyThreshold', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByWordsLearned() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsLearned', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      sortByWordsLearnedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsLearned', Sort.desc);
    });
  }
}

extension ReadingProgressQuerySortThenBy
    on QueryBuilder<ReadingProgress, ReadingProgress, QSortThenBy> {
  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy> thenByBookId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByBookIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByCanProceedToNextSection() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'canProceedToNextSection', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByCanProceedToNextSectionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'canProceedToNextSection', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByCurrentPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'currentPage', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByCurrentPageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'currentPage', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByProgressId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'progressId', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByProgressIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'progressId', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenBySectionCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionCompletedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenBySectionCompletedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionCompletedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenBySectionSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionSize', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenBySectionSizeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionSize', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenBySectionStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionStartedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenBySectionStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionStartedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenBySectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionType', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenBySectionTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionType', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByTotalPages() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPages', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByTotalPagesDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalPages', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByTotalWordsInSection() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWordsInSection', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByTotalWordsInSectionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWordsInSection', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy> thenByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByVocabularyThreshold() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'vocabularyThreshold', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByVocabularyThresholdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'vocabularyThreshold', Sort.desc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByWordsLearned() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsLearned', Sort.asc);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QAfterSortBy>
      thenByWordsLearnedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'wordsLearned', Sort.desc);
    });
  }
}

extension ReadingProgressQueryWhereDistinct
    on QueryBuilder<ReadingProgress, ReadingProgress, QDistinct> {
  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct> distinctByBookId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'bookId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByCanProceedToNextSection() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'canProceedToNextSection');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'createdAt');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByCurrentPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'currentPage');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByProgressId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'progressId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctBySectionCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'sectionCompletedAt');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctBySectionSize() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'sectionSize');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctBySectionStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'sectionStartedAt');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctBySectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'sectionType');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByTotalPages() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'totalPages');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByTotalWordsInSection() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'totalWordsInSection');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'updatedAt');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct> distinctByUserId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'userId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByVocabularyThreshold() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'vocabularyThreshold');
    });
  }

  QueryBuilder<ReadingProgress, ReadingProgress, QDistinct>
      distinctByWordsLearned() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'wordsLearned');
    });
  }
}

extension ReadingProgressQueryProperty
    on QueryBuilder<ReadingProgress, ReadingProgress, QQueryProperty> {
  QueryBuilder<ReadingProgress, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<ReadingProgress, String, QQueryOperations> bookIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'bookId');
    });
  }

  QueryBuilder<ReadingProgress, bool, QQueryOperations>
      canProceedToNextSectionProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'canProceedToNextSection');
    });
  }

  QueryBuilder<ReadingProgress, DateTime, QQueryOperations>
      createdAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'createdAt');
    });
  }

  QueryBuilder<ReadingProgress, int, QQueryOperations> currentPageProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'currentPage');
    });
  }

  QueryBuilder<ReadingProgress, String, QQueryOperations> progressIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'progressId');
    });
  }

  QueryBuilder<ReadingProgress, DateTime?, QQueryOperations>
      sectionCompletedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'sectionCompletedAt');
    });
  }

  QueryBuilder<ReadingProgress, int, QQueryOperations> sectionSizeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'sectionSize');
    });
  }

  QueryBuilder<ReadingProgress, DateTime?, QQueryOperations>
      sectionStartedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'sectionStartedAt');
    });
  }

  QueryBuilder<ReadingProgress, SectionType, QQueryOperations>
      sectionTypeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'sectionType');
    });
  }

  QueryBuilder<ReadingProgress, int, QQueryOperations> totalPagesProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'totalPages');
    });
  }

  QueryBuilder<ReadingProgress, int, QQueryOperations>
      totalWordsInSectionProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'totalWordsInSection');
    });
  }

  QueryBuilder<ReadingProgress, DateTime, QQueryOperations>
      updatedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'updatedAt');
    });
  }

  QueryBuilder<ReadingProgress, String?, QQueryOperations> userIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'userId');
    });
  }

  QueryBuilder<ReadingProgress, double, QQueryOperations>
      vocabularyThresholdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'vocabularyThreshold');
    });
  }

  QueryBuilder<ReadingProgress, int, QQueryOperations> wordsLearnedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'wordsLearned');
    });
  }
}
